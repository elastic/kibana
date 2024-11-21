/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchBulkCases } from './use_fetch_bulk_cases';
import { waitFor, renderHook } from '@testing-library/react';
import { kibanaStartMock } from '../utils/kibana_react.mock';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('Bulk Get Cases API hook', () => {
  it('initially is not loading and does not have data', async () => {
    const { result } = renderHook(() => useFetchBulkCases({ ids: [] }));

    await waitFor(() => {
      expect(result.current.cases).toEqual([]);
      expect(result.current.error).toEqual(undefined);
      expect(result.current.isLoading).toEqual(false);
    });
  });
});
