/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error as ApmError } from '@kbn/apm-types';
import { kqlQuery, rangeQuery, termQuery } from '@kbn/observability-plugin/server';
import { AT_TIMESTAMP, SERVICE_NAME } from '../../../common/es_fields/apm';
import { environmentQuery } from '../../../common/utils/environment_query';
import type { LogsClient } from '../../lib/helpers/create_es_client/create_logs_client';
import {
  optionalOtelFields,
  requiredOtelFields,
  toUnprocessedOtelError,
  unprocessedOtelExceptionQuery,
} from '../../lib/helpers/unprocessed_otel_errors';
import { compactMap } from '../../utils/compact_map';

/**
 * Maximum number of unprocessed OTel error rows returned per request.
 *
 * The logs client cannot aggregate, so unlike `main_statistics` there is no grouping
 * and no occurrence counts — every raw exception log is its own row. Capped at 500
 * (the most recent, sorted by `@timestamp desc`) to avoid overloading the browser with
 * a flat list. Surfaced to the caller via the `maxCountExceeded` flag.
 */
export const MAX_UNPROCESSED_OTEL_ERRORS = 500;

export interface UnprocessedOtelErrorsByServiceResponse {
  unprocessedOtelErrors: ApmError[];
  /** true when more than MAX_UNPROCESSED_OTEL_ERRORS documents matched the query. */
  maxCountExceeded: boolean;
}

/**
 * Fetches unprocessed OTel exception logs for a given service, scoped by the provided
 * `kuery`. The `kuery` is evaluated against LOGS mappings, not APM mappings, so APM-
 * specific fields (e.g. `error.grouping_key`) will match nothing rather than erroring.
 *
 * When navigating from the trace waterfall, the caller passes
 * `trace.id : "X" and (span.id : "Y" or transaction.id : "Y")` as `kuery`, which
 * narrows both sections of the Errors page (APM table + this logs list) to the same
 * span. `transaction.id` is unmapped in logs indices and resolves to match-nothing
 * rather than an error, so the clause is inert there; `span.id` is the active filter.
 *
 * Note on environment filtering: `environmentQuery` filters `service.environment`.
 * The OTel-native `logs-*.otel-*` data streams use `deployment.environment.name`
 * (OTel semconv) rather than `service.environment`. Verify against the fixture before
 * merge; if the alias is absent, widen to a bool.should over both field names.
 */
export async function getUnprocessedOtelErrorsByService({
  logsClient,
  serviceName,
  environment,
  kuery,
  start,
  end,
}: {
  logsClient: LogsClient;
  serviceName: string;
  environment: string;
  kuery: string;
  start: number;
  end: number;
}): Promise<UnprocessedOtelErrorsByServiceResponse> {
  // Over-fetch by one to detect truncation without a separate count phase.
  const fetchSize = MAX_UNPROCESSED_OTEL_ERRORS + 1;

  const response = await logsClient.search({
    query: unprocessedOtelExceptionQuery([
      ...rangeQuery(start, end),
      ...termQuery(SERVICE_NAME, serviceName),
      ...environmentQuery(environment),
      ...kqlQuery(kuery),
    ]),
    fields: [...requiredOtelFields, ...optionalOtelFields],
    size: fetchSize,
    sort: [{ [AT_TIMESTAMP]: { order: 'desc' } }],
  });

  const hits = response.hits.hits;
  const maxCountExceeded = hits.length > MAX_UNPROCESSED_OTEL_ERRORS;
  // Slice to the cap; the over-fetched extra is only used to detect truncation.
  const cappedHits = maxCountExceeded ? hits.slice(0, MAX_UNPROCESSED_OTEL_ERRORS) : hits;

  const unprocessedOtelErrors = compactMap(cappedHits, (hit) => toUnprocessedOtelError(hit));

  return { unprocessedOtelErrors, maxCountExceeded };
}
