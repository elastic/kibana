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

import { readdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PrebuiltRuleToInstall } from '../../../../../../../common/detection_engine/prebuilt_rules';
import { INSTALL_TEST_ASSETS_URL } from '../../../../../../../common/detection_engine/prebuilt_rules';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';

import { getFleetRules } from '../../../logic/get_latest_prebuilt_rules';
import type { RuleAssetFlatAttributes } from '../../../logic/poc/saved_objects/rule_asset_flat_saved_objects_type';
import type { RuleAssetCompositeAttributes } from '../../../logic/poc/saved_objects/rule_asset_composite_saved_objects_type';
import { ruleAssetSavedObjectsClientFactory } from '../../../logic/rule_asset/rule_asset_saved_objects_client';

// TODO: https://github.com/elastic/kibana/pull/144060 Delete this route before merge

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
        const ctx = await context.resolve(['core', 'alerting']);
        const savedObjectsClient = ctx.core.savedObjects.client;
        const ruleAssetsClient = ruleAssetSavedObjectsClientFactory(savedObjectsClient);

        const fleetRules = await getFleetRules(ruleAssetsClient);

        const versionedRuleAssets = generateVersionedRuleAssets(
          fleetRules,
          request.body.num_versions_per_rule
        );

        const flatDir = `${__dirname}/../../../../../../../../../../fleet-packages/detection-rules-flat/kibana/security_rule`;
        for (const file of await readdir(flatDir)) {
          await unlink(path.join(flatDir, file));
        }

        await Promise.all(
          versionedRuleAssets.flatAssets.map(async (asset) => {
            await writeFile(
              `${flatDir}/${asset.rule_id}.json`,
              JSON.stringify({
                attributes: asset,
                id: asset.rule_id,
                type: 'security-rule',
              })
            );
          })
        );

        const compositeDir = `${__dirname}/../../../../../../../../../../fleet-packages/detection-rules-composite/kibana/security_rule`;
        for (const file of await readdir(compositeDir)) {
          await unlink(path.join(compositeDir, file));
        }

        await Promise.all(
          versionedRuleAssets.compositeAssets.map(async (asset) => {
            await writeFile(
              `${compositeDir}/${asset.rule_id}.json`,
              JSON.stringify({
                attributes: asset,
                id: asset.rule_id,
                type: 'security-rule',
              })
            );
          })
        );

        return response.ok({
          body: { status: 'ok' },
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

interface GenerateVersionedRuleAssetsResult {
  flatAssets: RuleAssetFlatAttributes[];
  compositeAssets: RuleAssetCompositeAttributes[];
}

const generateVersionedRuleAssets = (
  rules: PrebuiltRuleToInstall[],
  numberOfVersionsPerRule: number
): GenerateVersionedRuleAssetsResult => {
  const flatAssets: RuleAssetFlatAttributes[] = [];
  const compositeAssets: RuleAssetCompositeAttributes[] = [];

  rules.forEach((rule) => {
    flatAssets.push(...generateFlatRuleAssets(rule, numberOfVersionsPerRule));
    compositeAssets.push(generateCompositeRuleAsset(rule, numberOfVersionsPerRule));
  });

  return { flatAssets, compositeAssets };
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
      rule_id: `${ruleId}:${semanticVersion}`,
      rule_version: semanticVersion,
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
      rule_version: semanticVersion,
      stack_version_min: '8.5.0',
      stack_version_max: '8.7.0',
      ...restOfRuleAttributes,
    });
  }

  return result;
};

const getSemanticVersion = (ruleVersion: number, patchVersion: number): string =>
  `${ruleVersion}.0.${patchVersion}`;
