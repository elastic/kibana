/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';

import { validate } from '../../../../../common/validate';
import {
  PrePackagedRulesAndTimelinesSchema,
  prePackagedRulesAndTimelinesSchema,
} from '../../../../../common/detection_engine/schemas/response/prepackaged_rules_schema';
import { importTimelineResultSchema } from '../../../../../common/types/timeline';
import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';

import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import { buildFrameworkRequest } from '../../../timeline/routes/utils/common';
import { installPrepackagedTimelines } from '../../../timeline/routes/utils/install_prepacked_timelines';

import { getIndexExists } from '../../index/get_index_exists';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { installPrepackagedRules } from '../../rules/install_prepacked_rules';
import { updatePrepackagedRules } from '../../rules/update_prepacked_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';

import { transformError, buildSiemResponse } from '../utils';

export const addPrepackedRulesRoute = (
  router: IRouter,
  config: ConfigType,
  security: SetupPlugins['security']
) => {
  router.put(
    {
      path: DETECTION_ENGINE_PREPACKAGED_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);
      const frameworkRequest = await buildFrameworkRequest(context, security, _);

      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const clusterClient = context.core.elasticsearch.legacy.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        // This will create the endpoint list if it does not exist yet
        await context.lists?.getExceptionListClient().createEndpointList();

        const rulesFromFileSystem = getPrepackagedRules();
        const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);
        const signalsIndex = siemClient.getSignalsIndex();
        if (rulesToInstall.length !== 0 || rulesToUpdate.length !== 0) {
          const signalsIndexExists = await getIndexExists(
            clusterClient.callAsCurrentUser,
            signalsIndex
          );
          if (!signalsIndexExists) {
            return siemResponse.error({
              statusCode: 400,
              body: `Pre-packaged rules cannot be installed until the signals index is created: ${signalsIndex}`,
            });
          }
        }
        const result = await Promise.all([
          installPrepackagedRules(alertsClient, rulesToInstall, signalsIndex),
          installPrepackagedTimelines(config.maxTimelineImportExportSize, frameworkRequest, true),
        ]);
        const [prepackagedTimelinesResult, timelinesErrors] = validate(
          result[1],
          importTimelineResultSchema
        );
        await updatePrepackagedRules(alertsClient, savedObjectsClient, rulesToUpdate, signalsIndex);

        const prepackagedRulesOutput: PrePackagedRulesAndTimelinesSchema = {
          rules_installed: rulesToInstall.length,
          rules_updated: rulesToUpdate.length,
          timelines_installed: prepackagedTimelinesResult?.timelines_installed ?? 0,
          timelines_updated: prepackagedTimelinesResult?.timelines_updated ?? 0,
        };
        const [validated, genericErrors] = validate(
          prepackagedRulesOutput,
          prePackagedRulesAndTimelinesSchema
        );
        if (genericErrors != null && timelinesErrors != null) {
          return siemResponse.error({
            statusCode: 500,
            body: [genericErrors, timelinesErrors].filter((msg) => msg != null).join(', '),
          });
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
