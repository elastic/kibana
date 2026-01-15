/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { DataTier } from '@kbn/observability-shared-plugin/common';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * Checks if the cluster contains "unprocessed" OpenTelemetry trace documents.
 *
 * We define "unprocessed OTEL" as:
 * - documents that look like trace/span documents (have `span.id`)
 * - and have not been processed by APM ingest pipelines (do NOT have `processor.event`)
 *
 * This is intentionally a backend (cluster-scope) check (similar to `has_data`), and does not
 * attempt to mirror the current Discover query/timepicker (Scope A).
 */
export async function hasUnprocessedOtelData(apmEventClient: APMEventClient) {
  const hasDataInWarmOrHotDataTiers = await hasUnprocessedOtelRequest(apmEventClient, [
    'data_hot',
    'data_warm',
  ]);

  if (hasDataInWarmOrHotDataTiers) {
    return true;
  }

  const hasDataUnbounded = await hasUnprocessedOtelRequest(apmEventClient);

  return hasDataUnbounded;
}

async function hasUnprocessedOtelRequest(apmEventClient: APMEventClient, dataTiers?: DataTier[]) {
  // the `observability:searchExcludedDataTiers` setting will also be considered
  // in the `search` function to exclude data tiers from the search
  const tierFilter = dataTiers ? [{ terms: { _tier: dataTiers } }] : [];

  const params = {
    apm: {
      /**
       * POC comment:
       * Query both transaction and span indices because OTEL traces may be stored in either,
       * depending on the configured indices and ingest pipelines.
       * This is to set the right indexes for the query
       *
       * There's an issue to create a separate client for more flexible queries https://github.com/elastic/kibana/issues/243512
       */
      events: [ProcessorEvent.transaction, ProcessorEvent.span],
    },
    terminate_after: 1,
    track_total_hits: 1,
    size: 0,
    query: {
      bool: {
        filter: [...tierFilter],
        must_not: [{ exists: { field: 'processor.event' } }],
      },
    },
  };

  const resp = await apmEventClient.search('has_unprocessed_otel_data', params);
  return resp.hits.total.value > 0;
}
