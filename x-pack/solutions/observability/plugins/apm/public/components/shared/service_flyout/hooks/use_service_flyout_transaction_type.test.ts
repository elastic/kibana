/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { ApmDocumentType } from '../../../../../common/document_type';
import { RollupInterval } from '../../../../../common/rollup';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useServiceFlyoutTransactionType } from './use_service_flyout_transaction_type';

const mockUseServiceTransactionTypesFetcher = jest.fn();
jest.mock('../../../../context/apm_service/use_service_transaction_types_fetcher', () => ({
  useServiceTransactionTypesFetcher: (...args: unknown[]) =>
    mockUseServiceTransactionTypesFetcher(...args),
}));

const mockUsePreferredDataSourceAndBucketSize = jest.fn();
jest.mock('../../../../hooks/use_preferred_data_source_and_bucket_size', () => ({
  usePreferredDataSourceAndBucketSize: (...args: unknown[]) =>
    mockUsePreferredDataSourceAndBucketSize(...args),
}));

const BASE_PARAMS = {
  serviceName: 'opbeans-java',
  agentName: 'java',
  start: '2024-01-01T00:00:00.000Z',
  end: '2024-01-01T01:00:00.000Z',
  transactionType: '',
};

type HookParams = Parameters<typeof useServiceFlyoutTransactionType>[0];

function renderTransactionType(params: Partial<HookParams> = {}) {
  return renderHook(() => useServiceFlyoutTransactionType({ ...BASE_PARAMS, ...params }));
}

describe('useServiceFlyoutTransactionType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePreferredDataSourceAndBucketSize.mockReturnValue({
      bucketSizeInSeconds: 60,
      source: {
        documentType: ApmDocumentType.TransactionMetric,
        rollupInterval: RollupInterval.OneMinute,
      },
    });
    mockUseServiceTransactionTypesFetcher.mockReturnValue({
      transactionTypes: ['request', 'worker'],
      status: FETCH_STATUS.SUCCESS,
    });
  });

  it('reads the transaction types from the source the chart APIs prefer', () => {
    renderTransactionType();

    expect(mockUseServiceTransactionTypesFetcher).toHaveBeenCalledWith({
      serviceName: 'opbeans-java',
      start: BASE_PARAMS.start,
      end: BASE_PARAMS.end,
      documentType: ApmDocumentType.TransactionMetric,
      rollupInterval: RollupInterval.OneMinute,
    });
  });

  it('keeps the transaction type the caller already selected', () => {
    const { result } = renderTransactionType({ transactionType: 'worker' });

    expect(result.current.selectedTransactionType).toBe('worker');
  });

  it('defaults to the agent default when the caller has no selection', () => {
    const { result } = renderTransactionType();

    expect(result.current.selectedTransactionType).toBe('request');
  });

  it('resolves a transaction type even without an agent name', () => {
    const { result } = renderTransactionType({ agentName: undefined });

    expect(result.current.selectedTransactionType).toBe('request');
  });

  it('falls back to the first reported type when the default is not available', () => {
    mockUseServiceTransactionTypesFetcher.mockReturnValue({
      transactionTypes: ['worker', 'messaging'],
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderTransactionType({ agentName: undefined });

    expect(result.current.selectedTransactionType).toBe('worker');
  });

  it('reports no transaction type when the service has none', () => {
    mockUseServiceTransactionTypesFetcher.mockReturnValue({
      transactionTypes: [],
      status: FETCH_STATUS.SUCCESS,
    });

    const { result } = renderTransactionType();

    expect(result.current.selectedTransactionType).toBeUndefined();
    expect(result.current.isResolved).toBe(true);
  });

  it.each([FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED])(
    'is unresolved while the fetch is %s',
    (status) => {
      mockUseServiceTransactionTypesFetcher.mockReturnValue({ transactionTypes: [], status });

      const { result } = renderTransactionType();

      expect(result.current.isResolved).toBe(false);
    }
  );

  it('pushes the resolved transaction type back to the caller', () => {
    const setTransactionType = jest.fn();

    renderTransactionType({ setTransactionType });

    expect(setTransactionType).toHaveBeenCalledWith('request');
  });

  it('does not push the transaction type when it already matches', () => {
    const setTransactionType = jest.fn();

    renderTransactionType({ transactionType: 'request', setTransactionType });

    expect(setTransactionType).not.toHaveBeenCalled();
  });
});
