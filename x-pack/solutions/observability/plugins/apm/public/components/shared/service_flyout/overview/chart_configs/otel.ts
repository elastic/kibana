/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import { DURATION, KIND, STATUS_CODE } from '@kbn/apm-types/es_fields';
import { TIME_BUCKET_BY, TIME_BUCKET_FIELD, applyServiceFilters } from './shared';
import type { ServiceScope } from './shared';

function createOtelBaseQuery({
  indices,
  scope,
}: {
  indices: string;
  scope: ServiceScope;
}): ComposerQuery {
  const query = esql.from(indices).where`${esql.col(KIND)} IN ("Server", "Consumer")`;
  applyServiceFilters(query, scope);
  return query;
}

export function buildOtelLatencyQuery(
  indices: string,
  scope: ServiceScope,
  aggregation: string
): ComposerQuery {
  const query = createOtelBaseQuery({ indices, scope });
  query.pipe(`EVAL duration_ms = TO_DOUBLE(${DURATION}) / 1000000`);
  query.pipe(`STATS ${aggregation} BY ${TIME_BUCKET_BY}`);
  return query;
}

export function buildOtelThroughputQuery(indices: string, scope: ServiceScope): ComposerQuery {
  const query = createOtelBaseQuery({ indices, scope });
  query.pipe(`STATS COUNT(*) BY ${TIME_BUCKET_BY}`);
  return query;
}

export function buildOtelErrorRateQuery(indices: string, scope: ServiceScope): ComposerQuery {
  const query = createOtelBaseQuery({ indices, scope });
  query.pipe(
    `STATS failure = COUNT(*) WHERE TO_STRING(${STATUS_CODE}) == "Error", all = COUNT(*) BY ${TIME_BUCKET_BY}`
  );
  query.pipe('EVAL failed_transaction_rate = TO_DOUBLE(failure) / all');
  query.pipe(`KEEP ${TIME_BUCKET_FIELD}, failed_transaction_rate`);
  query.pipe(`SORT ${TIME_BUCKET_FIELD}`);
  return query;
}

export const OTEL_ERROR_RATE_TITLE = i18n.translate(
  'xpack.apm.serviceFlyout.otelErrorRateChartTitle',
  { defaultMessage: 'Error rate' }
);
