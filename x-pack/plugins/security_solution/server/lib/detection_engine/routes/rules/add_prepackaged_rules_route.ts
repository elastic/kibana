/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate } from '../../../../../common/validate';
import {
  PrePackagedRulesSchema,
  prePackagedRulesSchema,
} from '../../../../../common/detection_engine/schemas/response/prepackaged_rules_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';
import { getIndexExists } from '../../index/get_index_exists';
import { transformError, buildSiemResponse } from '../utils';
import { getPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { installPrepackagedRules } from '../../rules/install_prepacked_rules';
import { updatePrepackagedRules } from '../../rules/update_prepacked_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';
import { getPrepackagedTimelines } from '../../rules/get_prepackaged_timelines';
import { ConfigType } from '../../../../config';
import { SetupPlugins } from '../../../../plugin';
import { importTimelines as installPrepackagedTimelines } from '../../../timeline/routes/utils/import_timelines';
import { buildFrameworkRequest } from '../../../timeline/routes/utils/common';

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

        const rulesFromFileSystem = getPrepackagedRules();
        const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
        const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
        const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);
        const signalsIndex = siemClient.getSignalsIndex();
        const templatesToInstall = await getPrepackagedTimelines();

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
          installPrepackagedTimelines(
            templatesToInstall,
            config.maxTimelineImportExportSize,
            response,
            frameworkRequest
          ),
        ]);
        const prepackagedTimelinesResult = result[1];
        await updatePrepackagedRules(alertsClient, savedObjectsClient, rulesToUpdate, signalsIndex);
        const prepackagedRulesOutput: PrePackagedRulesSchema = {
          rules_installed: rulesToInstall.length,
          rules_updated: rulesToUpdate.length,
          timelines_installed: prepackagedTimelinesResult?.success_count ?? 0,
          timelines_updated: prepackagedTimelinesResult?.updated ?? 0,
        };
        const [validated, rulesErrors] = validate(prepackagedRulesOutput, prePackagedRulesSchema);
        if (rulesErrors != null) {
          return siemResponse.error({
            statusCode: 500,
            body: rulesErrors,
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
