/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useLicense } from '../../../../common/hooks/use_license';
import { useCanSeeHostIsolationExceptionsMenu } from './hooks';
import { act, renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../common/mock';
import { getHostIsolationExceptionSummary } from '../service';

jest.mock('../../../../common/hooks/use_license');
jest.mock('../service');

const getHostIsolationExceptionSummaryMock = getHostIsolationExceptionSummary as jest.Mock;

describe('host isolation exceptions hooks', () => {
  const isPlatinumPlusMock = useLicense().isPlatinumPlus as jest.Mock;
  describe('useCanSeeHostIsolationExceptionsMenu', () => {
    beforeEach(() => {
      isPlatinumPlusMock.mockReset();
    });
    it('should return true if the license is platinum plus', () => {
      isPlatinumPlusMock.mockReturnValue(true);
      const { result } = renderHook(() => useCanSeeHostIsolationExceptionsMenu(), {
        wrapper: TestProviders,
      });
      expect(result.current).toBe(true);
    });

    it('should return false if the license is lower platinum plus and there are not existing host isolation items', () => {
      isPlatinumPlusMock.mockReturnValue(false);
      getHostIsolationExceptionSummaryMock.mockReturnValueOnce({ total: 0 });
      const { result } = renderHook(() => useCanSeeHostIsolationExceptionsMenu(), {
        wrapper: TestProviders,
      });
      expect(result.current).toBe(false);
    });

    it('should return true if the license is lower platinum plus and there are existing host isolation items', async () => {
      isPlatinumPlusMock.mockReturnValue(false);
      getHostIsolationExceptionSummaryMock.mockReturnValueOnce({ total: 11 });
      const { result, waitForNextUpdate } = renderHook(
        () => useCanSeeHostIsolationExceptionsMenu(),
        {
          wrapper: TestProviders,
        }
      );
      await waitForNextUpdate();
      expect(result.current).toBe(true);
    });
  });
});
