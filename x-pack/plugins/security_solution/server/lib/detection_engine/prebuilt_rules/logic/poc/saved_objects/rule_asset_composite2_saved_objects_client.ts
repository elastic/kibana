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
import { RULE_ASSET_COMPOSITE2_SO_TYPE } from './rule_asset_composite2_saved_objects_type';
import type { RuleAssetComposite2Attributes } from './rule_asset_composite2_saved_objects_type';

const MAX_RULE_ASSETS_PER_REQUEST = 100;

export interface IComposite2RuleAssetsClient {
  bulkDeleteAll(): Promise<void>;

  bulkCreate(rules: RuleAssetComposite2Attributes[]): Promise<void>;

  fetchLatestVersions(): Promise<PrebuiltRuleVersionInfo[]>;

  fetchRulesByIdAndVersion(args: FetchSpecificRulesArgs): Promise<PrebuiltRuleContent[]>;
}

export interface FetchSpecificRulesArgs {
  rules: Array<{ id: RuleSignatureId; version: SemanticVersion }>;
}

type FindSelector<T> = (result: SavedObjectsFindResult<RuleAssetComposite2Attributes>) => T;

export const createComposite2RuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract
): IComposite2RuleAssetsClient => {
  const fetchAll = async <T>(selector: FindSelector<T>) => {
    const finder = savedObjectsClient.createPointInTimeFinder<RuleAssetComposite2Attributes>({
      perPage: MAX_RULE_ASSETS_PER_REQUEST,
      type: RULE_ASSET_COMPOSITE2_SO_TYPE,
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
      return withSecuritySpan('IComposite2RuleAssetsClient.bulkDeleteAll', async () => {
        const allIds = await fetchAll((so) => so.id);
        const allObjects: SavedObjectsBulkDeleteObject[] = allIds.map((id) => {
          return { type: RULE_ASSET_COMPOSITE2_SO_TYPE, id };
        });

        await savedObjectsClient.bulkDelete(allObjects, {
          refresh: false,
          force: true,
        });
      });
    },

    bulkCreate: (rules: RuleAssetComposite2Attributes[]): Promise<void> => {
      return withSecuritySpan('IComposite2RuleAssetsClient.bulkCreate', async () => {
        const objects: Array<SavedObjectsBulkCreateObject<RuleAssetComposite2Attributes>> =
          rules.map((rule) => ({
            id: rule.rule_id,
            type: RULE_ASSET_COMPOSITE2_SO_TYPE,
            attributes: rule,
          }));

        const chunks = chunk(objects, MAX_RULE_ASSETS_PER_REQUEST);

        for (const chunkOfObjects of chunks) {
          await savedObjectsClient.bulkCreate<RuleAssetComposite2Attributes>(chunkOfObjects, {
            refresh: false,
            overwrite: true,
          });
        }
      });
    },

    fetchLatestVersions: (): Promise<PrebuiltRuleVersionInfo[]> => {
      return withSecuritySpan('IComposite2RuleAssetsClient.fetchLatestVersions', async () => {
        const findResult = await savedObjectsClient.find<RuleAssetComposite2Attributes>({
          type: RULE_ASSET_COMPOSITE2_SO_TYPE,
          fields: [
            `${RULE_ASSET_COMPOSITE2_SO_TYPE}.rule_id`,
            `${RULE_ASSET_COMPOSITE2_SO_TYPE}.versions.rule_content_version`,
            `${RULE_ASSET_COMPOSITE2_SO_TYPE}.versions.stack_version_min`,
            `${RULE_ASSET_COMPOSITE2_SO_TYPE}.versions.stack_version_max`,
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
      return withSecuritySpan('IComposite2RuleAssetsClient.fetchRulesByIdAndVersion', async () => {
        const { rules } = args;

        if (rules.length === 0) {
          // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
          return [];
        }

        const attr = `${RULE_ASSET_COMPOSITE2_SO_TYPE}.attributes`;
        const filter = rules
          .map(({ id: ruleId, version: ruleVersion }) => {
            const versionKey = getVersionKey(ruleVersion);
            const contentKey = getContentKey(ruleId, versionKey);
            return `(${attr}.rule_id: ${ruleId} AND ${attr}.content.${contentKey}.name: *)`;
          })
          .join(' OR ');

        const contentKeyFields = rules.map(({ id: ruleId, version: ruleVersion }) => {
          const versionKey = getVersionKey(ruleVersion);
          const contentKey = getContentKey(ruleId, versionKey);
          return `${RULE_ASSET_COMPOSITE2_SO_TYPE}.content.${contentKey}`;
        });

        const fields = [`${RULE_ASSET_COMPOSITE2_SO_TYPE}.rule_id`, ...contentKeyFields];

        const findResult = await savedObjectsClient.find<RuleAssetComposite2Attributes>({
          type: RULE_ASSET_COMPOSITE2_SO_TYPE,
          filter,
          fields,
          perPage: 10000,
        });

        // TODO: Validate that returned objects match the schema of PrebuiltRuleContent
        return findResult.saved_objects.map((so) => {
          const contentOfRequestedVersion = Object.values(so.attributes.content)[0];
          const ruleContent: PrebuiltRuleContent = {
            ...contentOfRequestedVersion,
            rule_id: so.attributes.rule_id,
          };
          return ruleContent;
        });
      });
    },
  };
};

function findLatestVersion(versions: RuleAssetComposite2Attributes['versions']) {
  let latestVersion = versions[0];
  versions.slice(1).forEach((version) => {
    if (semver.lte(latestVersion.rule_content_version, version.rule_content_version))
      latestVersion = version;
  });

  return latestVersion;
}

const getVersionKey = (version: string): string => version.replaceAll('.', '_');

const getContentKey = (ruleId: string, versionKey: string): string => `${ruleId}__v${versionKey}`;
