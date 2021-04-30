/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { HOST_ISOLATION_FAILURE } from './translations';
import { createHostIsolation } from './api';

interface HostIsolationStatus {
  loading: boolean;
  isolateHost: () => Promise<boolean>;
}

interface UseHostIsolationProps {
  agentId: string;
  comment: string;
  alertId?: string;
}

export const useHostIsolation = ({
  agentId,
  comment,
  alertId,
}: UseHostIsolationProps): HostIsolationStatus => {
  const [loading, setLoading] = useState(false);
  const { addError } = useAppToasts();

  const isolateHost = useCallback(async () => {
    try {
      setLoading(true);
      const isolationStatus = await createHostIsolation({ agentId, comment, alertId });
      setLoading(false);
      return isolationStatus.action ? true : false;
    } catch (error) {
      setLoading(false);
      addError(error.message, { title: HOST_ISOLATION_FAILURE });
      return false;
    }
  }, [agentId, comment, alertId, addError]);
  return { loading, isolateHost };
};
