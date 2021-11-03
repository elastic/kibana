/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { HOST_ISOLATION_FAILURE } from './translations';
import { createHostUnIsolation } from './api';

interface HostUnisolationStatus {
  loading: boolean;
  unIsolateHost: () => Promise<boolean>;
}

interface UseHostIsolationProps {
  endpointId: string;
  comment: string;
  caseIds?: string[];
}

export const useHostUnisolation = ({
  endpointId,
  comment,
  caseIds,
}: UseHostIsolationProps): HostUnisolationStatus => {
  const [loading, setLoading] = useState(false);
  const { addError } = useAppToasts();

  const unIsolateHost = useCallback(async () => {
    try {
      setLoading(true);
      const isolationStatus = await createHostUnIsolation({ endpointId, comment, caseIds });
      setLoading(false);
      return isolationStatus.action ? true : false;
    } catch (error) {
      setLoading(false);
      addError(error.message, { title: HOST_ISOLATION_FAILURE });
      return false;
    }
  }, [endpointId, comment, caseIds, addError]);
  return { loading, unIsolateHost };
};
