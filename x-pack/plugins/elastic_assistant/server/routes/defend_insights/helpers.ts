/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';

import type {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type {
  ApiConfig,
  DefendInsightGenerationInterval,
  DefendInsightStat,
  DefendInsightStatus,
  DefendInsightsPostRequestBody,
  DefendInsightsResponse,
  ExecuteConnectorRequestBody,
  Replacements,
} from '@kbn/elastic-assistant-common';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { PublicMethodsOf } from '@kbn/utility-types';
import { transformError } from '@kbn/securitysolution-es-utils';

import type { GetRegisteredTools } from '../../services/app_context';
import type { AssistantToolParams } from '../../types';

import { DefendInsightsDataClient } from '../../ai_assistant_data_clients/defend_insights';
import {
  DEFEND_INSIGHT_ERROR_EVENT,
  DEFEND_INSIGHT_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { getLlmType } from '../utils';

const defendInsightStatus: { [k: string]: DefendInsightStatus } = {
  canceled: 'canceled',
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};

const getDataFromJSON = (defendInsightStringified: string) => {
  const { eventsContextCount, insights } = JSON.parse(defendInsightStringified);
  return { eventsContextCount, insights };
};

const addGenerationInterval = (
  generationIntervals: DefendInsightGenerationInterval[],
  generationInterval: DefendInsightGenerationInterval
): DefendInsightGenerationInterval[] => {
  const newGenerationIntervals = [generationInterval, ...generationIntervals];

  const MAX_GENERATION_INTERVALS = 5;
  if (newGenerationIntervals.length > MAX_GENERATION_INTERVALS) {
    return newGenerationIntervals.slice(0, MAX_GENERATION_INTERVALS); // Return the first MAX_GENERATION_INTERVALS items
  }

  return newGenerationIntervals;
};

export const getAssistantTool = (getRegisteredTools: GetRegisteredTools, pluginName: string) => {
  const assistantTools = getRegisteredTools(pluginName);
  return assistantTools.find((tool) => tool.id === 'defend-insights');
};

export const getAssistantToolParams = ({
  actionsClient,
  anonymizationFields,
  apiConfig,
  esClient,
  connectorTimeout,
  langChainTimeout,
  langSmithProject,
  langSmithApiKey,
  logger,
  latestReplacements,
  onNewReplacements,
  request,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  anonymizationFields?: AnonymizationFieldResponse[];
  apiConfig: ApiConfig;
  esClient: ElasticsearchClient;
  connectorTimeout: number;
  langChainTimeout: number;
  langSmithProject?: string;
  langSmithApiKey?: string;
  logger: Logger;
  latestReplacements: Replacements;
  onNewReplacements: (newReplacements: Replacements) => void;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | DefendInsightsPostRequestBody
  >;
}): AssistantToolParams => {
  const traceOptions = {
    projectName: langSmithProject,
    tracers: [
      ...getLangSmithTracer({
        apiKey: langSmithApiKey,
        projectName: langSmithProject,
        logger,
      }),
    ],
  };

  const llm = new ActionsClientLlm({
    actionsClient,
    connectorId: apiConfig.connectorId,
    llmType: getLlmType(apiConfig.actionTypeId),
    logger,
    temperature: 0, // zero temperature because we want structured JSON output
    timeout: connectorTimeout,
    traceOptions,
  });

  return {
    anonymizationFields,
    esClient,
    replacements: latestReplacements,
    langChainTimeout,
    llm,
    logger,
    onNewReplacements,
    request,
    modelExists: false,
    isEnabledKnowledgeBase: false,
  };
};

export const handleToolError = async ({
  apiConfig,
  defendInsightId,
  authenticatedUser,
  dataClient,
  err,
  latestReplacements,
  logger,
  telemetry,
}: {
  apiConfig: ApiConfig;
  defendInsightId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
  err: Error;
  latestReplacements: Replacements;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
}) => {
  try {
    logger.error(err);
    const error = transformError(err);
    const currentAd = await dataClient.getDefendInsight({
      id: defendInsightId,
      authenticatedUser,
    });

    if (currentAd === null || currentAd?.status === 'canceled') {
      return;
    }
    await dataClient.updateDefendInsight({
      defendInsightUpdateProps: {
        insights: [],
        status: defendInsightStatus.failed,
        id: defendInsightId,
        replacements: latestReplacements,
        backingIndex: currentAd.backingIndex,
        failureReason: error.message,
      },
      authenticatedUser,
    });
    telemetry.reportEvent(DEFEND_INSIGHT_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: error.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  } catch (updateErr) {
    const updateError = transformError(updateErr);
    telemetry.reportEvent(DEFEND_INSIGHT_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: updateError.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  }
};

export const updateDefendInsightStatusToRunning = async (
  dataClient: DefendInsightsDataClient,
  authenticatedUser: AuthenticatedUser,
  apiConfig: ApiConfig
): Promise<{
  currentInsight: DefendInsightsResponse;
  defendInsightId: string;
}> => {
  const foundDefendInsight = await dataClient?.findDefendInsightByConnectorId({
    connectorId: apiConfig.connectorId,
    authenticatedUser,
  });
  const currentInsight = foundDefendInsight
    ? await dataClient?.updateDefendInsight({
        defendInsightUpdateProps: {
          backingIndex: foundDefendInsight.backingIndex,
          id: foundDefendInsight.id,
          status: defendInsightStatus.running,
        },
        authenticatedUser,
      })
    : await dataClient?.createDefendInsight({
        defendInsightCreate: {
          apiConfig,
          insights: [],
          status: defendInsightStatus.running,
        },
        authenticatedUser,
      });

  if (!currentInsight) {
    throw new Error(
      `Could not ${foundDefendInsight ? 'update' : 'create'} Defend insight for connectorId: ${
        apiConfig.connectorId
      }`
    );
  }

  return {
    defendInsightId: currentInsight.id,
    currentInsight,
  };
};

export const updateDefendInsights = async ({
  apiConfig,
  defendInsightId,
  authenticatedUser,
  dataClient,
  latestReplacements,
  logger,
  rawDefendInsights,
  startTime,
  telemetry,
}: {
  apiConfig: ApiConfig;
  defendInsightId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
  latestReplacements: Replacements;
  logger: Logger;
  rawDefendInsights: string | null;
  startTime: Moment;
  telemetry: AnalyticsServiceSetup;
}) => {
  try {
    if (rawDefendInsights == null) {
      throw new Error('tool returned no Defend insights');
    }
    const currentAd = await dataClient.getDefendInsight({
      id: defendInsightId,
      authenticatedUser,
    });
    if (currentAd === null || currentAd?.status === 'canceled') {
      return;
    }
    const endTime = moment();
    const durationMs = endTime.diff(startTime);
    const { eventsContextCount, insights } = getDataFromJSON(rawDefendInsights);
    const updateProps = {
      eventsContextCount,
      insights,
      status: defendInsightStatus.succeeded,
      ...(eventsContextCount === 0 || insights === 0
        ? {}
        : {
            generationIntervals: addGenerationInterval(currentAd.generationIntervals, {
              durationMs,
              date: new Date().toISOString(),
            }),
          }),
      id: defendInsightId,
      replacements: latestReplacements,
      backingIndex: currentAd.backingIndex,
    };

    await dataClient.updateDefendInsight({
      defendInsightUpdateProps: updateProps,
      authenticatedUser,
    });
    telemetry.reportEvent(DEFEND_INSIGHT_SUCCESS_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      eventsContextCount: updateProps.eventsContextCount,
      insightsGenerated: updateProps.insights.length,
      durationMs,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  } catch (updateErr) {
    logger.error(updateErr);
    const updateError = transformError(updateErr);
    telemetry.reportEvent(DEFEND_INSIGHT_ERROR_EVENT.eventType, {
      actionTypeId: apiConfig.actionTypeId,
      errorMessage: updateError.message,
      model: apiConfig.model,
      provider: apiConfig.provider,
    });
  }
};

export const updateDefendInsightLastViewedAt = async ({
  connectorId,
  authenticatedUser,
  dataClient,
}: {
  connectorId: string;
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
}): Promise<DefendInsightsResponse | null> => {
  const defendInsight = await dataClient.findDefendInsightByConnectorId({
    connectorId,
    authenticatedUser,
  });

  if (defendInsight == null) {
    return null;
  }

  // update lastViewedAt time as this is the function used for polling by connectorId
  return dataClient.updateDefendInsight({
    defendInsightUpdateProps: {
      id: defendInsight.id,
      lastViewedAt: new Date().toISOString(),
      backingIndex: defendInsight.backingIndex,
    },
    authenticatedUser,
  });
};

export const getDefendInsightStats = async ({
  authenticatedUser,
  dataClient,
}: {
  authenticatedUser: AuthenticatedUser;
  dataClient: DefendInsightsDataClient;
}): Promise<DefendInsightStat[]> => {
  const defendInsights = await dataClient.findAllDefendInsights({
    authenticatedUser,
  });

  return defendInsights.map((defendInsight) => {
    const updatedAt = moment(defendInsight.updatedAt);
    const lastViewedAt = moment(defendInsight.lastViewedAt);
    const timeSinceLastViewed = updatedAt.diff(lastViewedAt);
    const hasViewed = timeSinceLastViewed <= 0;
    const discoveryCount = defendInsight.insights.length;
    return {
      hasViewed,
      status: defendInsight.status,
      count: discoveryCount,
      connectorId: defendInsight.apiConfig.connectorId,
    };
  });
};
