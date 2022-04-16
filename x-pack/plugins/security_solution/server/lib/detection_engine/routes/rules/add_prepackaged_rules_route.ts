/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { transformError, getIndexExists } from '@kbn/securitysolution-es-utils';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { ExceptionListClient } from '@kbn/lists-plugin/server';
import type {
  SecuritySolutionApiRequestHandlerContext,
  SecuritySolutionPluginRouter,
} from '../../../../types';

import {
  PrePackagedRulesAndTimelinesSchema,
  prePackagedRulesAndTimelinesSchema,
} from '../../../../../common/detection_engine/schemas/response/prepackaged_rules_schema';
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
        const rulesClient = context.alerting.getRulesClient();

        const validated = await createPrepackagedRules(
          context.securitySolution,
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
  const esClient = context.core.elasticsearch.client;
  const savedObjectsClient = context.core.savedObjects.client;
  const siemClient = context.getAppClient();
  const exceptionsListClient = context.getExceptionListClient() ?? exceptionsClient;
  const ruleAssetsClient = ruleAssetSavedObjectsClientFactory(savedObjectsClient);

  const {
    maxTimelineImportExportSize,
    prebuiltRulesFromFileSystem,
    prebuiltRulesFromSavedObjects,
    experimentalFeatures: { ruleRegistryEnabled },
  } = config;

  if (!siemClient || !rulesClient) {
    throw new PrepackagedRulesError('', 404);
  }

  // This will create the endpoint list if it does not exist yet
  if (exceptionsListClient != null) {
    await exceptionsListClient.createEndpointList();
  }

  const latestPrepackagedRules = await getLatestPrepackagedRules(
    ruleAssetsClient,
    prebuiltRulesFromFileSystem,
    prebuiltRulesFromSavedObjects
  );
  const prepackagedRules = await getExistingPrepackagedRules({
    rulesClient,
    isRuleRegistryEnabled: ruleRegistryEnabled,
  });
  const rulesToInstall = getRulesToInstall(latestPrepackagedRules, prepackagedRules);
  const rulesToUpdate = getRulesToUpdate(latestPrepackagedRules, prepackagedRules);
  const signalsIndex = siemClient.getSignalsIndex();
  if (!ruleRegistryEnabled && (rulesToInstall.length !== 0 || rulesToUpdate.length !== 0)) {
    const signalsIndexExists = await getIndexExists(esClient.asCurrentUser, signalsIndex);
    if (!signalsIndexExists) {
      throw new PrepackagedRulesError(
        `Pre-packaged rules cannot be installed until the signals index is created: ${signalsIndex}`,
        400
      );
    }
  }

  await Promise.all(
    installPrepackagedRules(rulesClient, rulesToInstall, signalsIndex, ruleRegistryEnabled)
  );
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
    signalsIndex,
    ruleRegistryEnabled,
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
