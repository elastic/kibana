/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppClient,
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';

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
import { AlertsClient } from '../../../../../../alerts/server';
import { FrameworkRequest } from '../../../framework';

import { ExceptionListClient } from '../../../../../../lists/server';

export const addPrepackedRulesRoute = (
  router: SecuritySolutionPluginRouter,
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
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const validated = await createPrepackagedRules(
          context,
          siemClient,
          alertsClient,
          frameworkRequest,
          config.maxTimelineImportExportSize
        );
        return response.ok({ body: validated ?? {} });
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

class PrepackagedRulesError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const createPrepackagedRules = async (
  context: SecuritySolutionRequestHandlerContext,
  siemClient: AppClient,
  alertsClient: AlertsClient,
  frameworkRequest: FrameworkRequest,
  maxTimelineImportExportSize: number,
  exceptionsClient?: ExceptionListClient
): Promise<PrePackagedRulesAndTimelinesSchema | null> => {
  const clusterClient = context.core.elasticsearch.legacy.client;
  const savedObjectsClient = context.core.savedObjects.client;
  const exceptionsListClient =
    context.lists != null ? context.lists.getExceptionListClient() : exceptionsClient;

  if (!siemClient || !alertsClient) {
    throw new PrepackagedRulesError('', 404);
  }

  // This will create the endpoint list if it does not exist yet
  if (exceptionsListClient != null) {
    await exceptionsListClient.createEndpointList();
  }

  const rulesFromFileSystem = getPrepackagedRules();
  const prepackagedRules = await getExistingPrepackagedRules({ alertsClient });
  const rulesToInstall = getRulesToInstall(rulesFromFileSystem, prepackagedRules);
  const rulesToUpdate = getRulesToUpdate(rulesFromFileSystem, prepackagedRules);
  const signalsIndex = siemClient.getSignalsIndex();
  if (rulesToInstall.length !== 0 || rulesToUpdate.length !== 0) {
    const signalsIndexExists = await getIndexExists(clusterClient.callAsCurrentUser, signalsIndex);
    if (!signalsIndexExists) {
      throw new PrepackagedRulesError(
        `Pre-packaged rules cannot be installed until the signals index is created: ${signalsIndex}`,
        400
      );
    }
  }

  await Promise.all(installPrepackagedRules(alertsClient, rulesToInstall, signalsIndex));
  const timeline = await installPrepackagedTimelines(
    maxTimelineImportExportSize,
    frameworkRequest,
    true
  );
  const [prepackagedTimelinesResult, timelinesErrors] = validate(
    timeline,
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
    throw new PrepackagedRulesError(
      [genericErrors, timelinesErrors].filter((msg) => msg != null).join(', '),
      500
    );
  }
  return validated;
};
