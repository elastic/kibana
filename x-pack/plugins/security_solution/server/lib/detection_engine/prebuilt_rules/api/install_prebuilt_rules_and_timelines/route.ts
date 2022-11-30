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
} from '../../../../../types';

import {
  PREBUILT_RULES_URL,
  InstallPrebuiltRulesAndTimelinesResponse,
} from '../../../../../../common/detection_engine/prebuilt_rules';
import { importTimelineResultSchema } from '../../../../../../common/types/timeline';

import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { getLatestPrebuiltRules } from '../../logic/get_latest_prebuilt_rules';
import { createPrebuiltRules } from '../../logic/create_prebuilt_rules';
import { updatePrebuiltRules } from '../../logic/update_prebuilt_rules';
import { getRulesToInstall } from '../../logic/get_rules_to_install';
import { getRulesToUpdate } from '../../logic/get_rules_to_update';
import { ruleAssetSavedObjectsClientFactory } from '../../logic/rule_asset/rule_asset_saved_objects_client';
import { rulesToMap } from '../../logic/utils';

import { installPrepackagedTimelines } from '../../../../timeline/routes/prepackaged_timelines/install_prepackaged_timelines';
import { buildSiemResponse } from '../../../routes/utils';

export const installPrebuiltRulesAndTimelinesRoute = (router: SecuritySolutionPluginRouter) => {
  router.put(
    {
      path: PREBUILT_RULES_URL,
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
): Promise<InstallPrebuiltRulesAndTimelinesResponse | null> => {
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

  const latestPrepackagedRulesMap = await getLatestPrebuiltRules(
    ruleAssetsClient,
    prebuiltRulesFromFileSystem,
    prebuiltRulesFromSavedObjects
  );
  const installedPrePackagedRules = rulesToMap(await getExistingPrepackagedRules({ rulesClient }));
  const rulesToInstall = getRulesToInstall(latestPrepackagedRulesMap, installedPrePackagedRules);
  const rulesToUpdate = getRulesToUpdate(latestPrepackagedRulesMap, installedPrePackagedRules);

  await createPrebuiltRules(rulesClient, rulesToInstall);

  const timeline = await installPrepackagedTimelines(
    maxTimelineImportExportSize,
    frameworkRequest,
    true
  );
  const [prepackagedTimelinesResult, timelinesErrors] = validate(
    timeline,
    importTimelineResultSchema
  );

  await updatePrebuiltRules(
    rulesClient,
    savedObjectsClient,
    rulesToUpdate,
    context.getRuleExecutionLog()
  );

  const prepackagedRulesOutput: InstallPrebuiltRulesAndTimelinesResponse = {
    rules_installed: rulesToInstall.length,
    rules_updated: rulesToUpdate.length,
    timelines_installed: prepackagedTimelinesResult?.timelines_installed ?? 0,
    timelines_updated: prepackagedTimelinesResult?.timelines_updated ?? 0,
  };

  const [validated, genericErrors] = validate(
    prepackagedRulesOutput,
    InstallPrebuiltRulesAndTimelinesResponse
  );

  if (genericErrors != null && timelinesErrors != null) {
    throw new PrepackagedRulesError(
      [genericErrors, timelinesErrors].filter((msg) => msg != null).join(', '),
      500
    );
  }

  return validated;
};
