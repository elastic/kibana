/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { checkArtifactHasData } from '../../services/exceptions_list/check_artifact_has_data';
import type { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';

export const useHostIsolationExceptionsAccess = (
  canAccessHostIsolationExceptions: boolean,
  canReadHostIsolationExceptions: boolean,
  apiClient: () => ExceptionsListApiClient
) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      // canAccessHostIsolationExceptions is a paid feature, so the tab should always be displayed.
      // canReadHostIsolationExceptions, however, is not a paid feature, which allows users to view and delete exceptions in case of a downgrade.
      // In such cases, the tab should be visible only if there is existing data.
      if (canAccessHostIsolationExceptions) {
        setHasAccess(true);
      } else if (canReadHostIsolationExceptions) {
        const result = await checkArtifactHasData(apiClient());
        setHasAccess(result);
      } else {
        setHasAccess(false);
      }
    })();
  }, [canAccessHostIsolationExceptions, canReadHostIsolationExceptions, apiClient]);

  return hasAccess;
};
