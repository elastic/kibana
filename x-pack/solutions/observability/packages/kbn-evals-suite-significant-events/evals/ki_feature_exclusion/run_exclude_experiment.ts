/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDuplicateFeature } from '@kbn/significant-events-schema';
import { type ExcludedFeatureSummary, sumTokens } from '@kbn/nightshift-ai';
import { sortBy } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { MANAGED_STREAM_NAME } from '../../src/datasets';
import type { ExcludeExperimentOutput } from '../../src/evaluators/ki_feature_exclusion/evaluators';
import { fetchSampleDocuments } from './fetch_sample_documents';
import { runFeatureIdentificationAgent } from '../../src/run_feature_identification_agent';

export async function runExcludeExperiment({
  esClient,
  excludeCount,
  followUpRuns,
  fetch,
  connectorId,
  sampleSize,
  log,
}: {
  esClient: Client;
  excludeCount: number;
  followUpRuns: number;
  fetch: HttpHandler;
  connectorId: string;
  sampleSize: number;
  log: ToolingLog;
}): Promise<ExcludeExperimentOutput> {
  const sampleDocuments = await fetchSampleDocuments({
    esClient,
    sampleSize,
    log,
  });

  const initialResult = await runFeatureIdentificationAgent({
    fetch,
    log,
    streamName: MANAGED_STREAM_NAME,
    connectorId,
    sampleDocuments,
  });

  const initialFeatures = initialResult.features;
  let tokensUsed = sumTokens({ added: initialResult.tokensUsed });

  log.info(`Initial identification returned ${initialFeatures.length} features`);

  if (initialFeatures.length < excludeCount) {
    log.info(
      `Not enough features identified (${initialFeatures.length}) to exclude ${excludeCount}, skipping follow-up runs`
    );
    return {
      initialFeatures,
      excludedFeatures: [],
      followUpRuns: [],
      tokens_used: tokensUsed,
    };
  }

  const featuresToExclude = sortBy(initialFeatures, (f) => f.id).slice(0, excludeCount);
  const excludedFeatures: ExcludedFeatureSummary[] = featuresToExclude.map(
    ({ id, type, subtype, title, description, properties }) => ({
      id,
      type,
      subtype,
      title,
      description,
      properties,
    })
  );

  const outputs: ExcludeExperimentOutput['followUpRuns'] = [];

  for (let i = 0; i < followUpRuns; i++) {
    const followUpResult = await runFeatureIdentificationAgent({
      fetch,
      log,
      streamName: MANAGED_STREAM_NAME,
      connectorId,
      sampleDocuments,
      excludedFeatures,
    });

    const { features: rawFeatures, ignoredFeatures } = followUpResult;
    tokensUsed = sumTokens({ accumulated: tokensUsed, added: followUpResult.tokensUsed });

    const features = rawFeatures.filter(
      (feature) =>
        !excludedFeatures.some((excluded) =>
          isDuplicateFeature(feature, {
            ...excluded,
            stream_name: feature.stream_name,
            confidence: 0,
            description: excluded.description ?? '',
          })
        )
    );

    outputs.push({ features, rawFeatures, ignoredFeatures });
  }

  return {
    initialFeatures,
    excludedFeatures,
    followUpRuns: outputs,
    tokens_used: tokensUsed,
  };
}
