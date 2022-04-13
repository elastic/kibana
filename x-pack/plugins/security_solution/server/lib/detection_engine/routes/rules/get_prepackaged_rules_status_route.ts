/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import {
  PrePackagedRulesAndTimelinesStatusSchema,
  prePackagedRulesAndTimelinesStatusSchema,
} from '../../../../../common/detection_engine/schemas/response/prepackaged_rules_status_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { findRules } from '../../rules/find_rules';
import { getLatestPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';
import { ruleAssetSavedObjectsClientFactory } from '../../rules/rule_asset/rule_asset_saved_objects_client';
import { buildFrameworkRequest } from '../../../timeline/utils/common';
import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import {
  checkTimelinesStatus,
  checkTimelineStatusRt,
} from '../../../timeline/utils/check_timelines_status';

export const getPrepackagedRulesStatusRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security'],
  isRuleRegistryEnabled: boolean
) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_PREPACKAGED_URL}/_status`,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const savedObjectsClient = (await context.core).savedObjects.client;
      const rulesClient = (await context.alerting).getRulesClient();
      const ruleAssetsClient = ruleAssetSavedObjectsClientFactory(savedObjectsClient);

      try {
        const latestPrepackagedRules = await getLatestPrepackagedRules(
          ruleAssetsClient,
          config.prebuiltRulesFromFileSystem,
          config.prebuiltRulesFromSavedObjects
        );
        const customRules = await findRules({
          isRuleRegistryEnabled,
          rulesClient,
          perPage: 1,
          page: 1,
          sortField: 'enabled',
          sortOrder: 'desc',
          filter: 'alert.attributes.tags:"__internal_immutable:false"',
          fields: undefined,
        });
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const prepackagedRules = await getExistingPrepackagedRules({
          rulesClient,
          isRuleRegistryEnabled,
        });

        const rulesToInstall = getRulesToInstall(latestPrepackagedRules, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(latestPrepackagedRules, prepackagedRules);
        const prepackagedTimelineStatus = await checkTimelinesStatus(frameworkRequest);
        const [validatedprepackagedTimelineStatus] = validate(
          prepackagedTimelineStatus,
          checkTimelineStatusRt
        );

        const prepackagedRulesStatus: PrePackagedRulesAndTimelinesStatusSchema = {
          rules_custom_installed: customRules.total,
          rules_installed: prepackagedRules.length,
          rules_not_installed: rulesToInstall.length,
          rules_not_updated: rulesToUpdate.length,
          timelines_installed: validatedprepackagedTimelineStatus?.prepackagedTimelines.length ?? 0,
          timelines_not_installed:
            validatedprepackagedTimelineStatus?.timelinesToInstall.length ?? 0,
          timelines_not_updated: validatedprepackagedTimelineStatus?.timelinesToUpdate.length ?? 0,
        };
        const [validated, errors] = validate(
          prepackagedRulesStatus,
          prePackagedRulesAndTimelinesStatusSchema
        );
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
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
