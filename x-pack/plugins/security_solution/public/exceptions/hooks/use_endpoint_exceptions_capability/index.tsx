/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useListsPrivileges } from '../../../detections/containers/detection_engine/lists/use_lists_privileges';
import { useHasSecurityCapability } from '../../../helper_hooks';
import { useKibana } from '../../../common/lib/kibana';

export const useEndpointExceptionsCapability = (
  capability: 'showEndpointExceptions' | 'crudEndpointExceptions'
): boolean => {
  const { lists } = useKibana().services;
  const { canReadIndex, canWriteIndex, loading: privilegesLoading } = useListsPrivileges();
  const enabled = lists != null;
  const hasListPrivilege = useMemo(
    () =>
      capability === 'showEndpointExceptions' ? canReadIndex === false : canWriteIndex === false,
    [canReadIndex, canWriteIndex, capability]
  );
  const canAccessLists = !enabled || hasListPrivilege;
  const hasAccessToLists = !(privilegesLoading || canAccessLists);

  const hasEndpointExceptionCapability = useHasSecurityCapability(capability);

  return useMemo(
    () => hasAccessToLists && hasEndpointExceptionCapability,
    [hasEndpointExceptionCapability, hasAccessToLists]
  );
};
