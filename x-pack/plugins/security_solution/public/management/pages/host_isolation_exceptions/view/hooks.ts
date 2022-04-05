/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo } from 'react';
import { useEndpointPrivileges } from '../../../../common/components/user_privileges/endpoint';
import { useHttp } from '../../../../common/lib/kibana/hooks';
import { useSummaryArtifact } from '../../../hooks/artifacts';
import { HostIsolationExceptionsApiClient } from '../host_isolation_exceptions_api_client';

/**
 * Checks if the current user should be able to see the host isolation exceptions
 * menu item based on their current privileges
 */
export function useCanSeeHostIsolationExceptionsMenu(): boolean {
  const http = useHttp();
  const privileges = useEndpointPrivileges();
  const {
    data: summary,
    isError: isApiError,
    refetch: checkIfHasExceptions,
  } = useSummaryArtifact(HostIsolationExceptionsApiClient.getInstance(http), undefined, undefined, {
    enabled: false,
  });

  const canSeeMenu = useMemo(() => {
    return privileges.canIsolateHost || (!isApiError && Boolean(summary?.total));
  }, [isApiError, privileges.canIsolateHost, summary?.total]);

  useEffect(() => {
    if (!canSeeMenu && !privileges.loading) {
      checkIfHasExceptions();
    }
  }, [canSeeMenu, checkIfHasExceptions, http, privileges.canIsolateHost, privileges.loading]);

  return canSeeMenu;
}
