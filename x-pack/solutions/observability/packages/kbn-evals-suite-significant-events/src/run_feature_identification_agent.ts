/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { BaseFeature, IgnoredFeature } from '@kbn/significant-events-schema';
import {
  EMPTY_TOKENS,
  type InferenceDocument,
  type ExcludedFeatureSummary,
  type PreviouslyIdentifiedFeature,
} from '@kbn/nightshift-ai';
import { createAgentBuilderClient, type ConverseStep } from '@kbn/evals';
import {
  buildFeatureIdentificationUserMessage,
  FEATURE_IDENTIFICATION_AGENT_ID,
  FINALIZE_FEATURES_TOOL_ID,
  parseFinalizedFeatures,
  type RawFinalizeFeaturesParams,
} from '@kbn/significant-events-plugin/server';

export interface RunFeatureIdentificationAgentParams {
  fetch: HttpHandler;
  log: ToolingLog;
  streamName: string;
  connectorId: string;
  sampleDocuments: InferenceDocument[];
  previouslyIdentifiedFeatures?: PreviouslyIdentifiedFeature[];
  excludedFeatures?: ExcludedFeatureSummary[];
  knownFeatureIds?: string;
}

export interface RunFeatureIdentificationAgentResult {
  features: BaseFeature[];
  ignoredFeatures: IgnoredFeature[];
  tokensUsed: ChatCompletionTokenCount;
}

export const getSuccessfulFinalizeFeaturesParams = (
  steps: ConverseStep[]
): RawFinalizeFeaturesParams => {
  const finalizeStep = steps.findLast(
    (step) =>
      step.type === 'tool_call' &&
      step.tool_id === FINALIZE_FEATURES_TOOL_ID &&
      step.results?.some(
        (toolResult) =>
          typeof toolResult === 'object' &&
          toolResult !== null &&
          'data' in toolResult &&
          typeof toolResult.data === 'object' &&
          toolResult.data !== null &&
          'finalized' in toolResult.data &&
          toolResult.data.finalized === true
      )
  );
  if (!finalizeStep?.params) {
    throw new Error('Feature identification agent did not successfully call its finalization tool');
  }
  const rawParams = finalizeStep.params as RawFinalizeFeaturesParams;
  if (!Array.isArray(rawParams.features)) {
    throw new Error('Feature identification agent returned invalid finalization output');
  }
  return rawParams;
};

export async function runFeatureIdentificationAgent({
  fetch,
  log,
  streamName,
  connectorId,
  sampleDocuments,
  previouslyIdentifiedFeatures,
  excludedFeatures,
  knownFeatureIds,
}: RunFeatureIdentificationAgentParams): Promise<RunFeatureIdentificationAgentResult> {
  const agentBuilderClient = createAgentBuilderClient({ fetch, log, connectorId });
  const conversation = await agentBuilderClient.createConversation({
    agentId: FEATURE_IDENTIFICATION_AGENT_ID,
    title: `Feature identification: ${streamName}`,
  });
  const userMessage = buildFeatureIdentificationUserMessage({
    streamName,
    sampleDocuments: JSON.stringify(sampleDocuments),
    previouslyIdentifiedFeatures: previouslyIdentifiedFeatures?.length
      ? JSON.stringify(previouslyIdentifiedFeatures)
      : undefined,
    excludedFeatures: excludedFeatures?.length ? JSON.stringify(excludedFeatures) : undefined,
    knownFeatureIds,
  });
  const result = await agentBuilderClient.converse({
    agentId: FEATURE_IDENTIFICATION_AGENT_ID,
    conversationId: conversation.id,
    input: userMessage,
  });
  const rawParams = getSuccessfulFinalizeFeaturesParams(result.steps);

  const { features, ignoredFeatures } = parseFinalizedFeatures(rawParams, streamName);

  return {
    features,
    ignoredFeatures,
    tokensUsed: result.tokensUsed ?? { ...EMPTY_TOKENS },
  };
}
