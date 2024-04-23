/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
import { either } from 'fp-ts/lib/Either';
import { BoolQuery } from '@kbn/es-query';
import { ApmDocumentType } from '../../common/document_type';
import { RollupInterval } from '../../common/rollup';

export { environmentRt } from '../../common/environment_rt';

export const rangeRt = t.type({
  start: isoToEpochRt,
  end: isoToEpochRt,
});

export const probabilityRt = t.type({
  probability: toNumberRt,
});
export const kueryRt = t.type({ kuery: t.string });

export const serviceTransactionDataSourceRt = t.type({
  documentType: t.union([
    t.literal(ApmDocumentType.ServiceTransactionMetric),
    t.literal(ApmDocumentType.TransactionMetric),
    t.literal(ApmDocumentType.TransactionEvent),
  ]),
  rollupInterval: t.union([
    t.literal(RollupInterval.OneMinute),
    t.literal(RollupInterval.TenMinutes),
    t.literal(RollupInterval.SixtyMinutes),
    t.literal(RollupInterval.None),
  ]),
});

export const transactionDataSourceRt = t.type({
  documentType: t.union([
    t.literal(ApmDocumentType.TransactionMetric),
    t.literal(ApmDocumentType.TransactionEvent),
  ]),
  rollupInterval: t.union([
    t.literal(RollupInterval.OneMinute),
    t.literal(RollupInterval.TenMinutes),
    t.literal(RollupInterval.SixtyMinutes),
    t.literal(RollupInterval.None),
  ]),
});

export const filtersRt = new t.Type<BoolQuery, string, unknown>(
  'BoolQuery',
  (input: unknown): input is BoolQuery => input instanceof BoolQuery,
  (input: unknown, context: t.Context) =>
    either.chain(t.string.validate(input, context), (value: string) => {
      try {
        const parsedFilters = JSON.parse(value);
        const decoded = {
          should: [],
          must: [],
          must_not: parsedFilters.must_not ? [...parsedFilters.must_not] : [],
          filter: parsedFilters.filter ? [...parsedFilters.filter] : [],
        };
        return t.success(decoded);
      } catch (err) {
        return t.failure(input, context);
      }
    }),
  (filters: BoolQuery): string => JSON.stringify(filters)
);
