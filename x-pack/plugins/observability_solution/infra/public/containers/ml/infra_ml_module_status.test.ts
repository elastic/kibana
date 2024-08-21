/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useModuleStatus } from './infra_ml_module_status';

describe('useModuleStatus', () => {
  it('should handle failedSetup action with job and datafeed error reasons', () => {
    const { result } = renderHook(() => useModuleStatus(['job']));
    const datafeedSetupResults = datafeedSetupResultsWithError('datafeed');
    const jobSetupResults = jobSetupResultsWithError('job');

    act(() => {
      result.current[1]({
        type: 'finishedSetup',
        sourceId: 'sourceId',
        spaceId: 'spaceId',
        jobSetupResults,
        jobSummaries: [],
        datafeedSetupResults,
      });
    });

    expect(result.current[0].setupStatus).toEqual({
      type: 'failed',
      reasons: [datafeedSetupResults[0].error.error.reason, jobSetupResults[0].error.error.reason],
    });
  });

  const setupResultError = (id: string) => {
    const errorType = 'error';

    return {
      error: {
        status: 500,
        error: {
          reason: `${id} failed`,
          type: errorType,
          root_cause: [
            {
              reason: `${id} failed (root cause)`,
              type: errorType,
            },
          ],
        },
      },
    };
  };

  const datafeedSetupResultsWithError = (id: string) => {
    return [
      {
        id,
        success: true,
        started: true,
        ...setupResultError(id),
      },
    ];
  };

  const jobSetupResultsWithError = (id: string) => {
    return [
      {
        id,
        success: true,
        ...setupResultError(id),
      },
    ];
  };
});
