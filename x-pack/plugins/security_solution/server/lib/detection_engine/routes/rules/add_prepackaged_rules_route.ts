/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { transformError } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionPluginRouter,
} from '../../../../types';

import type { PrePackagedRulesAndTimelinesSchema } from '../../../../../common/detection_engine/schemas/response/prepackaged_rules_schema';
import { prePackagedRulesAndTimelinesSchema } from '../../../../../common/detection_engine/schemas/response/prepackaged_rules_schema';
import { importTimelineResultSchema } from '../../../../../common/types/timeline';
import { DETECTION_ENGINE_PREPACKAGED_URL } from '../../../../../common/constants';

import { getLatestPrepackagedRules } from '../../rules/get_prepackaged_rules';
import { installPrepackagedRules } from '../../rules/install_prepacked_rules';
import { updatePrepackagedRules } from '../../rules/update_prepacked_rules';
import { getRulesToInstall } from '../../rules/get_rules_to_install';
import { getRulesToUpdate } from '../../rules/get_rules_to_update';
import { getExistingPrepackagedRules } from '../../rules/get_existing_prepackaged_rules';
import { ruleAssetSavedObjectsClientFactory } from '../../rules/rule_asset/rule_asset_saved_objects_client';

import { buildSiemResponse } from '../utils';

import { installPrepackagedTimelines } from '../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';
import { rulesToMap } from '../../rules/utils';

export const addPrepackedRulesRoute = (router: SecuritySolutionPluginRouter) => {
  router.put(
    {
      path: DETECTION_ENGINE_PREPACKAGED_URL,
      validate: false,
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
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const rulesClient = (await context.alerting).getRulesClient();

        const validated = await createPrepackagedRules(
          await context.securitySolution,
          rulesClient,
          undefined
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

export class PrepackagedRulesError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const createPrepackagedRules = async (
  context: SecuritySolutionApiRequestHandlerContext,
  rulesClient: RulesClient,
  exceptionsClient?: ExceptionListClient
): Promise<PrePackagedRulesAndTimelinesSchema | null> => {
  const config = context.getConfig();
  const frameworkRequest = context.getFrameworkRequest();
  const savedObjectsClient = context.core.savedObjects.client;
  const siemClient = context.getAppClient();
  const exceptionsListClient = context.getExceptionListClient() ?? exceptionsClient;
  const ruleAssetsClient = ruleAssetSavedObjectsClientFactory(savedObjectsClient);

  const {
    maxTimelineImportExportSize,
    prebuiltRulesFromFileSystem,
    prebuiltRulesFromSavedObjects,
  } = config;

  if (!siemClient || !rulesClient) {
    throw new PrepackagedRulesError('', 404);
  }

  // This will create the endpoint list if it does not exist yet
  if (exceptionsListClient != null) {
    await exceptionsListClient.createEndpointList();
  }

  const latestPrepackagedRulesMap = await getLatestPrepackagedRules(
    ruleAssetsClient,
    prebuiltRulesFromFileSystem,
    prebuiltRulesFromSavedObjects
  );
  const installedPrePackagedRules = rulesToMap(await getExistingPrepackagedRules({ rulesClient }));
  const rulesToInstall = getRulesToInstall(latestPrepackagedRulesMap, installedPrePackagedRules);
  const rulesToUpdate = getRulesToUpdate(latestPrepackagedRulesMap, installedPrePackagedRules);

  await installPrepackagedRules(rulesClient, rulesToInstall);
  const timeline = await installPrepackagedTimelines(
    maxTimelineImportExportSize,
    frameworkRequest,
    true
  );
  const [prepackagedTimelinesResult, timelinesErrors] = validate(
    timeline,
    importTimelineResultSchema
  );
  await updatePrepackagedRules(
    rulesClient,
    savedObjectsClient,
    rulesToUpdate,
    context.getRuleExecutionLog()
  );

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
