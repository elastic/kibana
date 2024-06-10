/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup, AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import {
  ApiConfig,
  AttackDiscovery,
  AttackDiscoveryPostRequestBody,
  AttackDiscoveryResponse,
  AttackDiscoveryStatus,
  ExecuteConnectorRequestBody,
  GenerationInterval,
  Replacements,
} from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { v4 as uuidv4 } from 'uuid';
import { ActionsClientLlm } from '@kbn/langchain/server';

import moment, { Moment } from 'moment';
import { uniq } from 'lodash/fp';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { getLangSmithTracer } from '../evaluate/utils';
import { getLlmType } from '../utils';
import type { GetRegisteredTools } from '../../services/app_context';
import {
  ATTACK_DISCOVERY_ERROR_EVENT,
  ATTACK_DISCOVERY_SUCCESS_EVENT,
} from '../../lib/telemetry/event_based_telemetry';
import { AssistantToolParams } from '../../types';
import { AttackDiscoveryDataClient } from '../../ai_assistant_data_clients/attack_discovery';

export const REQUIRED_FOR_ATTACK_DISCOVERY: AnonymizationFieldResponse[] = [
  {
    id: uuidv4(),
    field: '_id',
    allowed: true,
    anonymized: true,
  },
  {
    id: uuidv4(),
    field: 'kibana.alert.original_time',
    allowed: true,
    anonymized: false,
  },
];

export const getAssistantToolParams = ({
  actions,
  alertsIndexPattern,
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
  size,
}: {
  actions: ActionsPluginStart;
  alertsIndexPattern: string;
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
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody
  >;
  size: number;
}) => {
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
    actions,
    connectorId: apiConfig.connectorId,
    llmType: getLlmType(apiConfig.actionTypeId),
    logger,
    request,
    temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
    timeout: connectorTimeout,
    traceOptions,
  });

  return formatAssistantToolParams({
    alertsIndexPattern,
    anonymizationFields,
    esClient,
    latestReplacements,
    langChainTimeout,
    llm,
    onNewReplacements,
    request,
    size,
  });
};

const formatAssistantToolParams = ({
  alertsIndexPattern,
  anonymizationFields,
  esClient,
  langChainTimeout,
  latestReplacements,
  llm,
  onNewReplacements,
  request,
  size,
}: {
  alertsIndexPattern: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  langChainTimeout: number;
  latestReplacements: Replacements;
  llm: ActionsClientLlm;
  onNewReplacements: (newReplacements: Replacements) => void;
  request: KibanaRequest<
    unknown,
    unknown,
    ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody
  >;
  size: number;
}): AssistantToolParams => ({
  alertsIndexPattern,
  anonymizationFields: [...(anonymizationFields ?? []), ...REQUIRED_FOR_ATTACK_DISCOVERY],
  isEnabledKnowledgeBase: false, // not required for attack discovery
  chain: undefined, // not required for attack discovery
  esClient,
  langChainTimeout,
  llm,
  modelExists: false, // not required for attack discovery
  onNewReplacements,
  replacements: latestReplacements,
  request,
  size,
});

export const attackDiscoveryStatus: { [k: string]: AttackDiscoveryStatus } = {
  failed: 'failed',
  running: 'running',
  succeeded: 'succeeded',
};
const MAX_GENERATION_INTERVALS = 5;

export const addGenerationInterval = (
  generationIntervals: GenerationInterval[],
  generationInterval: GenerationInterval
): GenerationInterval[] => {
  const newGenerationIntervals = [generationInterval, ...generationIntervals];

  if (newGenerationIntervals.length > MAX_GENERATION_INTERVALS) {
    return newGenerationIntervals.slice(0, MAX_GENERATION_INTERVALS); // Return the first MAX_GENERATION_INTERVALS items
  }

  return newGenerationIntervals;
};

export const updateAttackDiscoveryStatusToRunning = async (
  dataClient: AttackDiscoveryDataClient,
  authenticatedUser: AuthenticatedUser,
  apiConfig: ApiConfig,
  latestReplacements: Replacements
): Promise<{
  currentAd: AttackDiscoveryResponse;
  attackDiscoveryId: string;
}> => {
  const foundAttackDiscovery = await dataClient?.findAttackDiscoveryByConnectorId({
    connectorId: apiConfig.connectorId,
    authenticatedUser,
  });
  let currentAd: AttackDiscoveryResponse;
  let attackDiscoveryId: string;
  if (foundAttackDiscovery == null) {
    const ad = await dataClient?.createAttackDiscovery({
      attackDiscoveryCreate: {
        attackDiscoveries: [],
        apiConfig,
        status: attackDiscoveryStatus.running,
        replacements: latestReplacements,
      },
      authenticatedUser,
    });
    if (ad == null) {
      throw new Error(
        `Could not create attack discovery for connectorId: ${apiConfig.connectorId}`
      );
    } else {
      currentAd = ad;
    }
    attackDiscoveryId = currentAd.id;
  } else {
    attackDiscoveryId = foundAttackDiscovery.id;

    const ad = await dataClient?.updateAttackDiscovery({
      attackDiscoveryUpdateProps: {
        id: attackDiscoveryId,
        status: attackDiscoveryStatus.running,
        backingIndex: foundAttackDiscovery.backingIndex,
      },
      authenticatedUser,
    });
    if (ad == null) {
      throw new Error(
        `Could not update attack discovery for connectorId: ${apiConfig.connectorId}`
      );
    } else {
      currentAd = ad;
    }
  }
  return {
    currentAd,
    attackDiscoveryId,
  };
};

export const updateAttackDiscoveries = async ({
  apiConfig,
  attackDiscoveryId,
  authenticatedUser,
  currentAd,
  dataClient,
  latestReplacements,
  rawAttackDiscoveries,
  size,
  startTime,
  telemetry,
}: {
  apiConfig: ApiConfig;
  attackDiscoveryId: string;
  authenticatedUser: AuthenticatedUser;
  currentAd: AttackDiscoveryResponse;
  dataClient: AttackDiscoveryDataClient;
  latestReplacements: Replacements;
  rawAttackDiscoveries: string;
  size: number;
  startTime: Moment;
  telemetry: AnalyticsServiceSetup;
}) => {
  const getDataFromJSON = () => {
    const { alertsContextCount, attackDiscoveries } = JSON.parse(rawAttackDiscoveries);
    return { alertsContextCount, attackDiscoveries };
  };

  const endTime = moment();
  const durationMs = endTime.diff(startTime);

  if (rawAttackDiscoveries == null) {
    throw new Error('tool returned no attack discoveries');
  }
  const updateProps = {
    ...getDataFromJSON(),
    status: attackDiscoveryStatus.succeeded,
    generationIntervals: addGenerationInterval(currentAd.generationIntervals, {
      durationMs,
      date: new Date().toISOString(),
    }),
    id: attackDiscoveryId,
    replacements: latestReplacements,
    backingIndex: currentAd.backingIndex,
  };

  await dataClient.updateAttackDiscovery({
    attackDiscoveryUpdateProps: updateProps,
    authenticatedUser,
  });

  telemetry.reportEvent(ATTACK_DISCOVERY_SUCCESS_EVENT.eventType, {
    actionTypeId: apiConfig.actionTypeId,
    alertsContextCount: updateProps.alertsContextCount,
    alertsCount: uniq(
      updateProps.attackDiscoveries.flatMap(
        (attackDiscovery: AttackDiscovery) => attackDiscovery.alertIds
      )
    ).length,
    configuredAlertsCount: size,
    discoveriesGenerated: updateProps.attackDiscoveries.length,
    durationMs,
    model: apiConfig.model,
    provider: apiConfig.provider,
  });
};

export const handleToolError = async ({
  apiConfig,
  attackDiscoveryId,
  authenticatedUser,
  backingIndex,
  dataClient,
  err,
  latestReplacements,
  logger,
  telemetry,
}: {
  apiConfig: ApiConfig;
  attackDiscoveryId: string;
  authenticatedUser: AuthenticatedUser;
  backingIndex: string;
  dataClient: AttackDiscoveryDataClient;
  err: Error;
  latestReplacements: Replacements;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
}) => {
  logger.error(err);
  const error = transformError(err);
  telemetry.reportEvent(ATTACK_DISCOVERY_ERROR_EVENT.eventType, {
    actionTypeId: apiConfig.actionTypeId,
    errorMessage: error.message,
    model: apiConfig.model,
    provider: apiConfig.provider,
  });
  await dataClient.updateAttackDiscovery({
    attackDiscoveryUpdateProps: {
      attackDiscoveries: [],
      status: attackDiscoveryStatus.failed,
      id: attackDiscoveryId,
      replacements: latestReplacements,
      backingIndex,
    },
    authenticatedUser,
  });
};

export const getAssistantTool = (getRegisteredTools: GetRegisteredTools, pluginName: string) => {
  // get the attack discovery tool:
  const assistantTools = getRegisteredTools(pluginName);
  return assistantTools.find((tool) => tool.id === 'attack-discovery');
};
