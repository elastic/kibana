/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useHostIsolationExceptionsAccess } from './use_host_isolation_exceptions_access';
import { checkArtifactHasData } from '../../services/exceptions_list/check_artifact_has_data';

jest.mock('../../services/exceptions_list/check_artifact_has_data', () => ({
  checkArtifactHasData: jest.fn(),
}));

const mockArtifactHasData = (hasData = true) => {
  (checkArtifactHasData as jest.Mock).mockResolvedValueOnce(hasData);
};

describe('useHostIsolationExceptionsAccess', () => {
  const mockApiClient = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const setupHook = (canAccess: boolean, canRead: boolean) => {
    return renderHook(() => useHostIsolationExceptionsAccess(canAccess, canRead, mockApiClient));
  };

  test('should set access to true if canAccessHostIsolationExceptions is true', async () => {
    const { result, waitFor } = setupHook(true, false);

    await waitFor(() => expect(result.current.hasAccessToHostIsolationExceptions).toBe(true));
  });

  test('should check for artifact data if canReadHostIsolationExceptions is true and canAccessHostIsolationExceptions is false', async () => {
    mockArtifactHasData();

    const { result, waitFor } = setupHook(false, true);

    await waitFor(() => {
      expect(checkArtifactHasData).toHaveBeenCalledWith(mockApiClient());
      expect(result.current.hasAccessToHostIsolationExceptions).toBe(true);
    });
  });

  test('should set access to false if canReadHostIsolationExceptions is true but no artifact data exists', async () => {
    mockArtifactHasData(false);

    const { result, waitFor } = setupHook(false, true);

    await waitFor(() => {
      expect(checkArtifactHasData).toHaveBeenCalledWith(mockApiClient());
      expect(result.current.hasAccessToHostIsolationExceptions).toBe(false);
    });
  });

  test('should set access to false if neither canAccessHostIsolationExceptions nor canReadHostIsolationExceptions is true', async () => {
    const { result, waitFor } = setupHook(false, false);
    await waitFor(() => {
      expect(result.current.hasAccessToHostIsolationExceptions).toBe(false);
    });
  });

  test('should not call checkArtifactHasData if canAccessHostIsolationExceptions is true', async () => {
    const { result, waitFor } = setupHook(true, true);

    await waitFor(() => {
      expect(checkArtifactHasData).not.toHaveBeenCalled();
      expect(result.current.hasAccessToHostIsolationExceptions).toBe(true);
    });
  });
});
