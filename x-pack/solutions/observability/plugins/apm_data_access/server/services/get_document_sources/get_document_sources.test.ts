/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApmDocumentType } from '../../../common/document_type';
import { RollupInterval } from '../../../common/rollup';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getDocumentSources } from './get_document_sources';

interface MsearchResponse {
  hits?: { total: { value: number } };
}

// One sub-query is issued per document type and rollup interval, plus one extra
// for the legacy document type that looks for documents without a duration
// summary field. They are returned in this order.
const RESPONSE_INDEX = {
  SERVICE_TRANSACTION_METRIC_1M: 0,
  SERVICE_TRANSACTION_METRIC_10M: 1,
  SERVICE_TRANSACTION_METRIC_60M: 2,
  TRANSACTION_METRIC_1M: 3,
  TRANSACTION_METRIC_1M_WITHOUT_DURATION_SUMMARY: 4,
  TRANSACTION_METRIC_10M: 5,
  TRANSACTION_METRIC_60M: 6,
} as const;

const withDocs: MsearchResponse = { hits: { total: { value: 1 } } };
const withoutDocs: MsearchResponse = { hits: { total: { value: 0 } } };
// A sub-query that failed comes back without `hits`.
const failed: MsearchResponse = {};

const allSourcesAvailable = [
  {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
    hasDocs: true,
    hasDurationSummaryField: true,
  },
  {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.TenMinutes,
    hasDocs: true,
    hasDurationSummaryField: true,
  },
  {
    documentType: ApmDocumentType.ServiceTransactionMetric,
    rollupInterval: RollupInterval.SixtyMinutes,
    hasDocs: true,
    hasDurationSummaryField: true,
  },
  {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.OneMinute,
    hasDocs: true,
    hasDurationSummaryField: true,
  },
  {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.TenMinutes,
    hasDocs: true,
    hasDurationSummaryField: true,
  },
  {
    documentType: ApmDocumentType.TransactionMetric,
    rollupInterval: RollupInterval.SixtyMinutes,
    hasDocs: true,
    hasDurationSummaryField: true,
  },
  {
    documentType: ApmDocumentType.TransactionEvent,
    rollupInterval: RollupInterval.None,
    hasDocs: true,
    hasDurationSummaryField: false,
  },
];

const getSources = (overrides: Record<number, MsearchResponse>) => {
  const responses = Object.values(RESPONSE_INDEX).map((index) => overrides[index] ?? withDocs);
  const apmEventClient = {
    msearch: jest.fn().mockResolvedValue({ responses }),
  } as unknown as APMEventClient;

  return getDocumentSources({ apmEventClient, start: 0, end: 50000, kuery: '' });
};

describe('getDocumentSources', () => {
  it('reports documents for every source that returned hits', async () => {
    await expect(
      getSources({ [RESPONSE_INDEX.TRANSACTION_METRIC_1M_WITHOUT_DURATION_SUMMARY]: withoutDocs })
    ).resolves.toEqual(allSourcesAvailable);
  });

  it('reports no documents for a document type whose sub-query failed', async () => {
    const sources = await getSources({
      [RESPONSE_INDEX.TRANSACTION_METRIC_1M_WITHOUT_DURATION_SUMMARY]: withoutDocs,
      [RESPONSE_INDEX.SERVICE_TRANSACTION_METRIC_1M]: failed,
    });

    expect(
      sources.filter(
        ({ documentType }) => documentType === ApmDocumentType.ServiceTransactionMetric
      )
    ).toEqual([
      {
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
        hasDocs: false,
        hasDurationSummaryField: false,
      },
      {
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval: RollupInterval.TenMinutes,
        hasDocs: true,
        hasDurationSummaryField: true,
      },
      {
        documentType: ApmDocumentType.ServiceTransactionMetric,
        rollupInterval: RollupInterval.SixtyMinutes,
        hasDocs: true,
        hasDurationSummaryField: true,
      },
    ]);
  });

  it('keeps continuous rollups available when the legacy sub-query failed', async () => {
    await expect(
      getSources({ [RESPONSE_INDEX.TRANSACTION_METRIC_1M_WITHOUT_DURATION_SUMMARY]: failed })
    ).resolves.toEqual(allSourcesAvailable);
  });
});
