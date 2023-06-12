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

import { GENERATE_ASSETS_URL } from '../../../../../../common/detection_engine/prebuilt_rules';

import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { buildRouteValidation } from '../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../routes/utils';

import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { createPrebuiltRuleAssetsClient } from '../../logic/rule_assets/prebuilt_rule_assets_client';

type RequestBody = t.TypeOf<typeof RequestBody>;
const RequestBody = t.exact(
  t.type({
    num_versions_per_rule: PositiveIntegerGreaterThanZero,
  })
);

/**
 * NOTE: This is a helper endpoint for development and testing. It should be removed later.
 * This endpoint:
 *   - reads currently installed latest assets (saved objects of type security-rule)
 *   - generates more versions of rule assets based on the latest ones (multiple versions per rule)
 *   - writes the generated saved objects back to the kibana index
 */
export const generateAssetsRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: GENERATE_ASSETS_URL,
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
        const ruleAssetsClient = createPrebuiltRuleAssetsClient(soClient);

        const latestRules = await ruleAssetsClient.fetchLatestAssets();

        const historicalRules = generateHistoricalVersionsForManyRules(
          latestRules,
          request.body.num_versions_per_rule
        );

        await ruleAssetsClient.bulkCreateAssets(historicalRules);

        return response.ok({
          body: {
            num_latest_rules: latestRules.length,
            num_installed_versions: historicalRules.length,
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

const generateHistoricalVersionsForManyRules = (
  rules: PrebuiltRuleAsset[],
  numberOfVersionsPerRule: number
) => {
  const result: PrebuiltRuleAsset[] = [];

  rules.forEach((rule) => {
    result.push(...generateHistoricalVersionsForOneRule(rule, numberOfVersionsPerRule));
  });

  return result;
};

const generateHistoricalVersionsForOneRule = (
  rule: PrebuiltRuleAsset,
  numberOfVersionsPerRule: number
): PrebuiltRuleAsset[] => {
  const { name: ruleName, version: latestVersion, ...restOfRuleAttributes } = rule;
  const nextToLatestVersion = latestVersion + 1;
  const result: PrebuiltRuleAsset[] = [];

  for (let i = 0; i < numberOfVersionsPerRule; i++) {
    const historicalVersion = nextToLatestVersion + i;
    result.push({
      name: `${ruleName} v${historicalVersion}`,
      version: historicalVersion,
      ...restOfRuleAttributes,
    });
  }

  return result;
};
