/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { PrePackagedRulesAndTimelinesStatusSchema } from '../../../../../../common/detection_engine/schemas/response/prepackaged_rules_status_schema';
import { prePackagedRulesAndTimelinesStatusSchema } from '../../../../../../common/detection_engine/schemas/response/prepackaged_rules_status_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../types';
import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../../common/constants';
import { buildSiemResponse } from '../../../routes/utils';

import { getRulesToInstall } from '../../logic/get_rules_to_install';
import { getRulesToUpdate } from '../../logic/get_rules_to_update';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { getLatestPrepackagedRules } from '../../logic/get_prepackaged_rules';
import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { ruleAssetSavedObjectsClientFactory } from '../../logic/rule_asset/rule_asset_saved_objects_client';
import { buildFrameworkRequest } from '../../../../timeline/utils/common';
import type { ConfigType } from '../../../../../config';
import type { SetupPlugins } from '../../../../../plugin';
import {
  checkTimelinesStatus,
  checkTimelineStatusRt,
} from '../../../../timeline/utils/check_timelines_status';
import { rulesToMap } from '../../logic/utils';

export const getPrepackagedRulesStatusRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
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
      const ctx = await context.resolve(['core', 'alerting']);
      const savedObjectsClient = ctx.core.savedObjects.client;
      const rulesClient = ctx.alerting.getRulesClient();
      const ruleAssetsClient = ruleAssetSavedObjectsClientFactory(savedObjectsClient);

      try {
        const latestPrepackagedRules = await getLatestPrepackagedRules(
          ruleAssetsClient,
          config.prebuiltRulesFromFileSystem,
          config.prebuiltRulesFromSavedObjects
        );
        const customRules = await findRules({
          rulesClient,
          perPage: 1,
          page: 1,
          sortField: 'enabled',
          sortOrder: 'desc',
          filter: 'alert.attributes.params.immutable: false',
          fields: undefined,
        });
        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const installedPrePackagedRules = rulesToMap(
          await getExistingPrepackagedRules({ rulesClient })
        );

        const rulesToInstall = getRulesToInstall(latestPrepackagedRules, installedPrePackagedRules);
        const rulesToUpdate = getRulesToUpdate(latestPrepackagedRules, installedPrePackagedRules);
        const prepackagedTimelineStatus = await checkTimelinesStatus(frameworkRequest);
        const [validatedPrepackagedTimelineStatus] = validate(
          prepackagedTimelineStatus,
          checkTimelineStatusRt
        );

        const prepackagedRulesStatus: PrePackagedRulesAndTimelinesStatusSchema = {
          rules_custom_installed: customRules.total,
          rules_installed: installedPrePackagedRules.size,
          rules_not_installed: rulesToInstall.length,
          rules_not_updated: rulesToUpdate.length,
          timelines_installed: validatedPrepackagedTimelineStatus?.prepackagedTimelines.length ?? 0,
          timelines_not_installed:
            validatedPrepackagedTimelineStatus?.timelinesToInstall.length ?? 0,
          timelines_not_updated: validatedPrepackagedTimelineStatus?.timelinesToUpdate.length ?? 0,
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
