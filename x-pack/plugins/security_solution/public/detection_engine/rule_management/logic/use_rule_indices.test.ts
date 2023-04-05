/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useRuleIndices } from './use_rule_indices';
import { useGetInstalledJob } from '../../../common/components/ml/hooks/use_get_jobs';

jest.mock('../../../common/components/ml/hooks/use_get_jobs');

describe('useRuleIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return handle undefined parameters', async () => {
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual([]);
      return { loading: false, jobs: [] };
    });
    const { result } = renderHook(() => useRuleIndices());
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: [],
    });
  });

  it('should return default indices if ML job is not specified', async () => {
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual([]);
      return { loading: false, jobs: [] };
    });
    const defaultIndices = ['index1', 'index2'];
    const { result } = renderHook(() => useRuleIndices(undefined, defaultIndices));
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: defaultIndices,
    });
  });

  it('should return default indices if ML job is not specified 1', async () => {
    const machineLearningJobId = ['ml-job-1', 'ml-job-2'];
    (useGetInstalledJob as jest.Mock).mockImplementation((jobIds: string[]) => {
      expect(jobIds).toEqual(machineLearningJobId);
      return {
        loading: false,
        jobs: [{ results_index_name: 'index1' }, { results_index_name: 'index2' }],
      };
    });
    const defaultIndices = ['index1', 'index2'];
    const { result } = renderHook(() => useRuleIndices(machineLearningJobId, defaultIndices));
    expect(result.current).toEqual({
      mlJobLoading: false,
      ruleIndices: ['.ml-anomalies-index1'],
    });
  });
});
