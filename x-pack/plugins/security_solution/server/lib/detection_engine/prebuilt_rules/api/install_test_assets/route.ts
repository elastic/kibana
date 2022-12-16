/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import moment from 'moment';
import { transformError } from '@kbn/securitysolution-es-utils';
import { PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

import type { PrebuiltRuleToInstall } from '../../../../../../common/detection_engine/prebuilt_rules';
import { INSTALL_TEST_ASSETS_URL } from '../../../../../../common/detection_engine/prebuilt_rules';
import type { PrebuiltRuleContent } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';
import { getSemanticVersion } from '../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/semantic_version';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';

import { ruleAssetSavedObjectsClientFactory } from '../../logic/rule_asset/rule_asset_saved_objects_client';
import { getLatestPrebuiltRules } from '../../logic/get_latest_prebuilt_rules';
import type { RuleAssetFlatAttributes } from '../../logic/poc/saved_objects/rule_asset_flat_saved_objects_type';
import type { RuleAssetCompositeAttributes } from '../../logic/poc/saved_objects/rule_asset_composite_saved_objects_type';
import { createCompositeRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite_saved_objects_client';
import { createComposite2RuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_composite2_saved_objects_client';
import { createFlatRuleAssetsClient } from '../../logic/poc/saved_objects/rule_asset_flat_saved_objects_client';
import type {
  RuleAssetComposite2Attributes,
  RuleVersionInfo,
} from '../../logic/poc/saved_objects/rule_asset_composite2_saved_objects_type';

type RequestBody = t.TypeOf<typeof RequestBody>;
const RequestBody = t.exact(
  t.type({
    num_versions_per_rule: PositiveIntegerGreaterThanZero,
  })
);

export const installTestPrebuiltRuleAssetsRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: INSTALL_TEST_ASSETS_URL,
      validate: {
        body: buildRouteValidation(RequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
        timeout: {
          // FUNFACT: If we do not add a very long timeout what will happen
          // is that Chrome which receive a 408 error and then do a retry.
          // This retry can cause lots of connections to happen. Using a very
          // long timeout will ensure that Chrome does not do retries and saturate the connections.
          idleSocket: moment.duration('1', 'hour').asMilliseconds(),
        },
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const ctx = await context.resolve(['core']);
        const soClient = ctx.core.savedObjects.client;
        const ruleAssetsClient = ruleAssetSavedObjectsClientFactory(soClient);
        const flatRuleAssetsClient = createFlatRuleAssetsClient(soClient);
        const compositeRuleAssetsClient = createCompositeRuleAssetsClient(soClient);
        const composite2RuleAssetsClient = createComposite2RuleAssetsClient(soClient);

        const filesystemRules = await getLatestPrebuiltRules(ruleAssetsClient);

        const versionedRuleAssets = generateVersionedRuleAssets(
          Array.from(filesystemRules.values()),
          request.body.num_versions_per_rule
        );

        await flatRuleAssetsClient.bulkDeleteAll();
        await flatRuleAssetsClient.bulkCreate(versionedRuleAssets.flat);

        await compositeRuleAssetsClient.bulkDeleteAll();
        await compositeRuleAssetsClient.bulkCreate(versionedRuleAssets.composite);

        await composite2RuleAssetsClient.bulkDeleteAll();
        await composite2RuleAssetsClient.bulkCreate(versionedRuleAssets.composite2);

        return response.ok({
          body: {
            num_flat_assets: versionedRuleAssets.flat.length,
            num_composite_assets: versionedRuleAssets.composite.length,
          },
        });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};

const generateVersionedRuleAssets = (
  rules: PrebuiltRuleToInstall[],
  numberOfVersionsPerRule: number
) => {
  const flat: RuleAssetFlatAttributes[] = [];
  const composite: RuleAssetCompositeAttributes[] = [];
  const composite2: RuleAssetComposite2Attributes[] = [];

  rules.forEach((rule) => {
    flat.push(...generateFlatRuleAssets(rule, numberOfVersionsPerRule));
    composite.push(generateCompositeRuleAsset(rule, numberOfVersionsPerRule));
    composite2.push(generateComposite2RuleAsset(rule, numberOfVersionsPerRule));
  });

  return { flat, composite, composite2 };
};

const generateFlatRuleAssets = (
  rule: PrebuiltRuleToInstall,
  numberOfVersionsPerRule: number
): RuleAssetFlatAttributes[] => {
  const { name: ruleName, rule_id: ruleId, version: ruleVersion, ...restOfRuleAttributes } = rule;
  const result: RuleAssetFlatAttributes[] = [];

  for (let i = 0; i < numberOfVersionsPerRule; i++) {
    const semanticVersion = getSemanticVersion(ruleVersion, i);
    result.push({
      name: `${ruleName} v${semanticVersion}`,
      rule_id: ruleId,
      rule_content_version: semanticVersion,
      stack_version_min: '8.5.0',
      stack_version_max: '8.7.0',
      ...restOfRuleAttributes,
    });
  }

  return result;
};

const generateCompositeRuleAsset = (
  rule: PrebuiltRuleToInstall,
  numberOfVersionsPerRule: number
): RuleAssetCompositeAttributes => {
  const { name: ruleName, rule_id: ruleId, version: ruleVersion, ...restOfRuleAttributes } = rule;
  const result: RuleAssetCompositeAttributes = {
    rule_id: ruleId,
    versions: [],
  };

  for (let i = 0; i < numberOfVersionsPerRule; i++) {
    const semanticVersion = getSemanticVersion(ruleVersion, i);
    result.versions.push({
      name: `${ruleName} v${semanticVersion}`,
      rule_content_version: semanticVersion,
      stack_version_min: '8.5.0',
      stack_version_max: '8.7.0',
      ...restOfRuleAttributes,
    });
  }

  return result;
};

const generateComposite2RuleAsset = (
  rule: PrebuiltRuleToInstall,
  numberOfVersionsPerRule: number
): RuleAssetComposite2Attributes => {
  const { name: ruleName, rule_id: ruleId, version: ruleVersion, ...restOfRuleAttributes } = rule;
  const result: RuleAssetComposite2Attributes = {
    rule_id: ruleId,
    versions: [],
    content: {},
  };

  for (let i = 0; i < numberOfVersionsPerRule; i++) {
    const semanticVersion = getSemanticVersion(ruleVersion, i);
    const versionKey = getVersionKey(semanticVersion);
    const contentKey = getContentKey(ruleId, versionKey);

    const versionInfo: RuleVersionInfo = {
      rule_content_version: semanticVersion,
      stack_version_min: '8.5.0',
      stack_version_max: '8.7.0',
    };

    const content: PrebuiltRuleContent = {
      name: `${ruleName} v${semanticVersion}`,
      rule_id: ruleId,
      rule_content_version: semanticVersion,
      stack_version_min: '8.5.0',
      stack_version_max: '8.7.0',
      ...restOfRuleAttributes,
    };

    result.versions.push(versionInfo);
    result.content[contentKey] = content;
  }

  return result;
};

const getVersionKey = (version: string): string => version.replaceAll('.', '_');

const getContentKey = (ruleId: string, versionKey: string): string => `${ruleId}__v${versionKey}`;
