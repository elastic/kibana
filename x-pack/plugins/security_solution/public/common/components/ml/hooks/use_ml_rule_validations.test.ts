/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import { buildMockJobsSummary, getJobsSummaryResponseMock } from '../../ml_popover/api.mock';
import { useInstalledSecurityJobs } from './use_installed_security_jobs';

import { useMlRuleValidations } from './use_ml_rule_validations';

jest.mock('./use_installed_security_jobs');

describe('useMlRuleValidations', () => {
  const machineLearningJobId = ['test_job', 'test_job_2'];

  beforeEach(() => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValue({
      loading: true,
      jobs: [],
    });
  });

  it('returns loading state from inner hook', () => {
    const { result, rerender } = renderHook(() => useMlRuleValidations({ machineLearningJobId }), {
      wrapper: TestProviders,
    });
    expect(result.current).toEqual(expect.objectContaining({ loading: true }));

    (useInstalledSecurityJobs as jest.Mock).mockReturnValueOnce({
      loading: false,
      jobs: [],
    });

    rerender();

    expect(result.current).toEqual(expect.objectContaining({ loading: false }));
  });

  it('returns "no jobs started" when no jobs are started', () => {
    const { result } = renderHook(() => useMlRuleValidations({ machineLearningJobId }), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(
      expect.objectContaining({ noJobsStarted: true, allJobsStarted: false })
    );
  });

  it('returns a unique state when only some jobs are started', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValueOnce({
      loading: false,
      jobs: getJobsSummaryResponseMock([
        buildMockJobsSummary({
          id: machineLearningJobId[0],
          jobState: 'opened',
          datafeedState: 'started',
        }),
        buildMockJobsSummary({
          id: machineLearningJobId[1],
        }),
      ]),
    });

    const { result } = renderHook(() => useMlRuleValidations({ machineLearningJobId }), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(
      expect.objectContaining({ noJobsStarted: false, allJobsStarted: false })
    );
  });

  it('returns a unique state when all jobs are started', () => {
    (useInstalledSecurityJobs as jest.Mock).mockReturnValueOnce({
      loading: false,
      jobs: getJobsSummaryResponseMock([
        buildMockJobsSummary({
          id: machineLearningJobId[0],
          jobState: 'opened',
          datafeedState: 'started',
        }),
        buildMockJobsSummary({
          id: machineLearningJobId[1],
          jobState: 'opened',
          datafeedState: 'started',
        }),
      ]),
    });

    const { result } = renderHook(() => useMlRuleValidations({ machineLearningJobId }), {
      wrapper: TestProviders,
    });

    expect(result.current).toEqual(
      expect.objectContaining({ noJobsStarted: false, allJobsStarted: true })
    );
  });
});
