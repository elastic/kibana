/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useEndpointPrivileges } from '../../../../../../common/components/user_privileges/endpoint';

/**
 * Checks to see if the current user can access at least one artifact page.
 * Note that this hook will return `false` if the Authz is still being loaded.
 */
export const useCanAccessSomeArtifacts = (): boolean => {
  const {
    canReadBlocklist,
    canReadEventFilters,
    canReadTrustedApplications,
    canReadHostIsolationExceptions,
  } = useEndpointPrivileges();

  return useMemo(() => {
    return (
      canReadBlocklist ||
      canReadEventFilters ||
      canReadTrustedApplications ||
      canReadHostIsolationExceptions
    );
  }, [
    canReadBlocklist,
    canReadEventFilters,
    canReadTrustedApplications,
    canReadHostIsolationExceptions,
  ]);
};
