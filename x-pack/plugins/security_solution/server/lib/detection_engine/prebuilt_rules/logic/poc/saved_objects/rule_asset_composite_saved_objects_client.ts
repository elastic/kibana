/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import semver from 'semver';

import type {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkDeleteObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';

import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { PrebuiltRuleContent } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';
import type { PrebuiltRuleVersionInfo } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_version_info';
import type { SemanticVersion } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/semantic_version';
import type { RuleSignatureId } from '../../../../../../../common/detection_engine/rule_schema';
import { RULE_ASSET_COMPOSITE_SO_TYPE } from './rule_asset_composite_saved_objects_type';
import type { RuleAssetCompositeAttributes } from './rule_asset_composite_saved_objects_type';

const MAX_RULE_ASSETS_PER_REQUEST = 100;

export interface ICompositeRuleAssetsClient {
  bulkDeleteAll(): Promise<void>;

  bulkCreate(rules: RuleAssetCompositeAttributes[]): Promise<void>;

  fetchLatestVersions(): Promise<PrebuiltRuleVersionInfo[]>;

  fetchRulesByIdAndVersion(args: FetchSpecificRulesArgs): Promise<PrebuiltRuleContent[]>;
}

export interface FetchSpecificRulesArgs {
  rules: Array<{ id: RuleSignatureId; version: SemanticVersion }>;
}

type FindSelector<T> = (result: SavedObjectsFindResult<RuleAssetCompositeAttributes>) => T;

export const createCompositeRuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract
): ICompositeRuleAssetsClient => {
  const fetchAll = async <T>(selector: FindSelector<T>) => {
    const finder = savedObjectsClient.createPointInTimeFinder<RuleAssetCompositeAttributes>({
      perPage: MAX_RULE_ASSETS_PER_REQUEST,
      type: RULE_ASSET_COMPOSITE_SO_TYPE,
    });

    const result: T[] = [];

    for await (const response of finder.find()) {
      const selectedValues = response.saved_objects.map((so) => selector(so));
      result.push(...selectedValues);
    }

    await finder.close();

    return result;
  };

  return {
    bulkDeleteAll: (): Promise<void> => {
      return withSecuritySpan('ICompositeRuleAssetsClient.bulkDeleteAll', async () => {
        const allIds = await fetchAll((so) => so.id);
        const allObjects: SavedObjectsBulkDeleteObject[] = allIds.map((id) => {
          return { type: RULE_ASSET_COMPOSITE_SO_TYPE, id };
        });

        await savedObjectsClient.bulkDelete(allObjects, {
          refresh: false,
          force: true,
        });
      });
    },

    bulkCreate: (rules: RuleAssetCompositeAttributes[]): Promise<void> => {
      return withSecuritySpan('ICompositeRuleAssetsClient.bulkCreate', async () => {
        const objects: Array<SavedObjectsBulkCreateObject<RuleAssetCompositeAttributes>> =
          rules.map((rule) => ({
            id: rule.rule_id,
            type: RULE_ASSET_COMPOSITE_SO_TYPE,
            attributes: rule,
          }));

        const chunks = chunk(objects, MAX_RULE_ASSETS_PER_REQUEST);

        for (const chunkOfObjects of chunks) {
          await savedObjectsClient.bulkCreate<RuleAssetCompositeAttributes>(chunkOfObjects, {
            refresh: false,
            overwrite: true,
          });
        }
      });
    },

    fetchLatestVersions: (): Promise<PrebuiltRuleVersionInfo[]> => {
      return withSecuritySpan('ICompositeRuleAssetsClient.fetchLatestVersions', async () => {
        const findResult = await savedObjectsClient.find<RuleAssetCompositeAttributes>({
          type: RULE_ASSET_COMPOSITE_SO_TYPE,
          fields: [
            `${RULE_ASSET_COMPOSITE_SO_TYPE}.rule_id`,
            `${RULE_ASSET_COMPOSITE_SO_TYPE}.versions.name`,
            `${RULE_ASSET_COMPOSITE_SO_TYPE}.versions.rule_content_version`,
            `${RULE_ASSET_COMPOSITE_SO_TYPE}.versions.stack_version_min`,
            `${RULE_ASSET_COMPOSITE_SO_TYPE}.versions.stack_version_max`,
          ],
          perPage: 10000,
        });

        return findResult.saved_objects.map((so) => {
          const latestVersion = findLatestVersion(so.attributes.versions);
          const versionInfo: PrebuiltRuleVersionInfo = {
            rule_id: so.attributes.rule_id,
            rule_content_version: latestVersion.rule_content_version,
            stack_version_min: latestVersion.stack_version_min,
            stack_version_max: latestVersion.stack_version_max,
          };
          return versionInfo;
        });
      });
    },

    fetchRulesByIdAndVersion: (args: FetchSpecificRulesArgs): Promise<PrebuiltRuleContent[]> => {
      return withSecuritySpan('ICompositeRuleAssetsClient.fetchRulesByIdAndVersion', async () => {
        const { rules } = args;

        if (rules.length === 0) {
          // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
          return [];
        }

        const attr = `${RULE_ASSET_COMPOSITE_SO_TYPE}.attributes`;
        const filter = rules
          .map(
            (rule) =>
              `(${attr}.rule_id: ${rule.id} AND ${attr}.versions:{ rule_content_version: ${rule.version} })`
          )
          .join(' OR ');

        const findResult = await savedObjectsClient.find<RuleAssetCompositeAttributes>({
          type: RULE_ASSET_COMPOSITE_SO_TYPE,
          filter,
          perPage: 10000,
        });

        // TODO: Validate that returned objects match the schema of PrebuiltRuleContent
        return findResult.saved_objects.map((so) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const versionNum = rules.find((r) => r.id === so.attributes.rule_id)!.version;
          const versionObj = so.attributes.versions.find(
            (v) => v.rule_content_version === versionNum
          );
          const specificVersion = {
            rule_id: so.attributes.rule_id,
            ...versionObj,
          };
          return specificVersion as PrebuiltRuleContent;
        });
      });
    },
  };
};

function findLatestVersion(versions: RuleAssetCompositeAttributes['versions']) {
  let latestVersion = versions[0];
  versions.slice(1).forEach((version) => {
    if (semver.lte(latestVersion.rule_content_version, version.rule_content_version))
      latestVersion = version;
  });

  return latestVersion;
}
