/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { buildSiemResponse } from '../../../routes/utils';
import type { ConfigType } from '../../../../../config';
import type { SetupPlugins } from '../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../types';

import {
  PREBUILT_RULES_STATUS_URL,
  GetPrebuiltRulesAndTimelinesStatusResponse,
} from '../../../../../../common/detection_engine/prebuilt_rules';

import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { getLatestPrebuiltRules } from '../../logic/get_latest_prebuilt_rules';
import { getRulesToInstall } from '../../logic/get_rules_to_install';
import { getRulesToUpdate } from '../../logic/get_rules_to_update';
import { ruleAssetSavedObjectsClientFactory } from '../../logic/rule_asset/rule_asset_saved_objects_client';
import { rulesToMap } from '../../logic/utils';

import { buildFrameworkRequest } from '../../../../timeline/utils/common';
import {
  checkTimelinesStatus,
  checkTimelineStatusRt,
} from '../../../../timeline/utils/check_timelines_status';

export const getPrebuiltRulesAndTimelinesStatusRoute = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.get(
    {
      path: PREBUILT_RULES_STATUS_URL,
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
        const latestPrebuiltRules = await getLatestPrebuiltRules(
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

        const installedPrebuiltRules = rulesToMap(
          await getExistingPrepackagedRules({ rulesClient })
        );

        const rulesToInstall = getRulesToInstall(latestPrebuiltRules, installedPrebuiltRules);
        const rulesToUpdate = getRulesToUpdate(latestPrebuiltRules, installedPrebuiltRules);

        const frameworkRequest = await buildFrameworkRequest(context, security, request);
        const prebuiltTimelineStatus = await checkTimelinesStatus(frameworkRequest);
        const [validatedPrebuiltTimelineStatus] = validate(
          prebuiltTimelineStatus,
          checkTimelineStatusRt
        );

        const responseBody: GetPrebuiltRulesAndTimelinesStatusResponse = {
          rules_custom_installed: customRules.total,
          rules_installed: installedPrebuiltRules.size,
          rules_not_installed: rulesToInstall.length,
          rules_not_updated: rulesToUpdate.length,
          timelines_installed: validatedPrebuiltTimelineStatus?.prepackagedTimelines.length ?? 0,
          timelines_not_installed: validatedPrebuiltTimelineStatus?.timelinesToInstall.length ?? 0,
          timelines_not_updated: validatedPrebuiltTimelineStatus?.timelinesToUpdate.length ?? 0,
        };

        const [validatedBody, validationError] = validate(
          responseBody,
          GetPrebuiltRulesAndTimelinesStatusResponse
        );

        if (validationError != null) {
          return siemResponse.error({ statusCode: 500, body: validationError });
        } else {
          return response.ok({ body: validatedBody ?? {} });
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
