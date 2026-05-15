/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSynthtraceFixtureClient } from '@kbn/scout-synthtrace';
import type { EsClient, ScoutLogger } from '@kbn/scout-oblt';
import { metricsServices, setupOtelNativeJavaMetrics } from '../synthtrace/metrics_services';
import { awsLambda } from '../synthtrace/aws_lambda';
import { END_DATE, START_DATE } from '../constants';

interface IngestApmMetricsArgs {
  apmSynthtraceEsClient: ApmSynthtraceFixtureClient;
  esClient: EsClient;
  log: ScoutLogger;
}

/**
 * Single source of truth for the APM metrics dataset that backs both the
 * UI and API Scout suites: classic + OTel synth metric documents, the AWS
 * Lambda transactions fixture, and the OTel-native Java bulk-indexed
 * metrics. Use this from each Scout config's global setup so the UI/API
 * specs cannot drift on shape, ordering, or volume.
 */
export const ingestApmMetricsFixtures = async ({
  apmSynthtraceEsClient,
  esClient,
  log,
}: IngestApmMetricsArgs): Promise<void> => {
  const startMs = new Date(START_DATE).getTime();
  const endMs = new Date(END_DATE).getTime();

  await apmSynthtraceEsClient.index(metricsServices({ from: startMs, to: endMs }));
  log.info('APM metrics services data indexed');

  await apmSynthtraceEsClient.index(awsLambda({ from: startMs, to: endMs }));
  log.info('AWS Lambda services data indexed');

  await setupOtelNativeJavaMetrics(esClient, startMs, endMs);
  log.info('OTel-native Java metrics bulk-indexed into .otel-* indices');
};
