/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCanSeeHostIsolationExceptionsMenu } from './hooks';
import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../common/mock';
import { getHostIsolationExceptionSummary } from '../service';
import { useEndpointPrivileges } from '../../../../common/components/user_privileges/endpoint';

jest.mock('../../../../common/hooks/use_license');
jest.mock('../service');
jest.mock('../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');

const getHostIsolationExceptionSummaryMock = getHostIsolationExceptionSummary as jest.Mock;

describe('host isolation exceptions hooks', () => {
  const useEndpointPrivilegesMock = useEndpointPrivileges as jest.Mock;
  describe('useCanSeeHostIsolationExceptionsMenu', () => {
    beforeEach(() => {
      useEndpointPrivilegesMock.mockReset();
    });

    it('should return true if has the correct privileges', () => {
      useEndpointPrivilegesMock.mockReturnValue({ canIsolateHost: true });
      const { result } = renderHook(() => useCanSeeHostIsolationExceptionsMenu(), {
        wrapper: TestProviders,
      });
      expect(result.current).toBe(true);
    });

    it('should return false if does not have privileges and there are not existing host isolation items', () => {
      useEndpointPrivilegesMock.mockReturnValue({ canIsolateHost: false });
      getHostIsolationExceptionSummaryMock.mockReturnValueOnce({ total: 0 });
      const { result } = renderHook(() => useCanSeeHostIsolationExceptionsMenu(), {
        wrapper: TestProviders,
      });
      expect(result.current).toBe(false);
    });

    it('should return true if does not have privileges and there are existing host isolation items', async () => {
      useEndpointPrivilegesMock.mockReturnValue({ canIsolateHost: false });
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
