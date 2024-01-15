/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { autoCheckPrebuildRuleStepCompleted } from './helpers';
import { fetchRuleManagementFilters } from '../apis';
import type { HttpSetup } from '@kbn/core/public';

jest.mock('../apis');

describe('autoCheckPrebuildRuleStepCompleted', () => {
  const mockHttp = {} as HttpSetup;
  const mockAbortController = new AbortController();

  it('should return true if there are enabled rules', async () => {
    (fetchRuleManagementFilters as jest.Mock).mockResolvedValue({ total: 1 });
    const result = await autoCheckPrebuildRuleStepCompleted({
      abortSignal: { current: mockAbortController },
      kibanaServicesHttp: mockHttp,
    });
    expect(result).toBe(true);
  });

  it('should call onError and return false on error', async () => {
    const mockError = new Error('Test error');
    (fetchRuleManagementFilters as jest.Mock).mockRejectedValue(mockError);
    const mockOnError = jest.fn();

    const result = await autoCheckPrebuildRuleStepCompleted({
      abortSignal: { current: mockAbortController },
      kibanaServicesHttp: mockHttp,
      onError: mockOnError,
    });

    expect(mockOnError).toHaveBeenCalledWith(mockError);
    expect(result).toBe(false);
  });

  it('should not call onError if the request is aborted', async () => {
    (fetchRuleManagementFilters as jest.Mock).mockRejectedValue({ name: 'AbortError' });
    const mockOnError = jest.fn();

    mockAbortController.abort();

    const result = await autoCheckPrebuildRuleStepCompleted({
      abortSignal: { current: mockAbortController },
      kibanaServicesHttp: mockHttp,
      onError: mockOnError,
    });

    expect(mockOnError).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });
});
