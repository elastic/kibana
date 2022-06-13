/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { HOST_ISOLATION_FAILURE, ENDPOINT_RESPONSE_ACTION_FAILURE } from './translations';
import { createHostIsolation, createEndpointResponseAction } from './api';

interface HostIsolationStatus {
  loading: boolean;
  /** Boolean return will indicate if isolation action was created successful */
  isolateHost: () => Promise<boolean>;
}

interface UseHostIsolationProps {
  endpointId: string;
  comment: string;
  caseIds?: string[];
}

interface UseEndpointResponseActionProps {
  endpointId: string;
  comment: string;
  caseIds?: string[];
  command: string;
  parameters?: {};
}

interface EndpointResponseActionStatus {
  loading: boolean;
  /** Boolean return will indicate if isolation action was created successful */
  executeResponseAction: () => Promise<boolean>;
}

export const useHostIsolation = ({
  endpointId,
  comment,
  caseIds,
}: UseHostIsolationProps): HostIsolationStatus => {
  const [loading, setLoading] = useState(false);
  const { addError } = useAppToasts();

  const isolateHost = useCallback(async () => {
    try {
      setLoading(true);
      const isolationStatus = await createHostIsolation({ endpointId, comment, caseIds });
      setLoading(false);
      return isolationStatus.action ? true : false;
    } catch (error) {
      setLoading(false);
      addError(error.message, { title: HOST_ISOLATION_FAILURE });
      return false;
    }
  }, [endpointId, comment, caseIds, addError]);
  return { loading, isolateHost };
};

export const useEndpointResponseAction = ({
  endpointId,
  comment,
  caseIds,
  command,
  parameters,
}: UseEndpointResponseActionProps): EndpointResponseActionStatus => {
  const [loading, setLoading] = useState(false);
  const { addError } = useAppToasts();

  const executeResponseAction = useCallback(async () => {
    try {
      setLoading(true);
      const responseActionStatus = await createEndpointResponseAction({
        endpointId,
        comment,
        caseIds,
        command,
        parameters,
      });
      setLoading(false);
      return responseActionStatus.action ? true : false;
    } catch (error) {
      setLoading(false);
      addError(error.message, { title: ENDPOINT_RESPONSE_ACTION_FAILURE });
      return false;
    }
  }, [endpointId, comment, caseIds, addError]);
  return { loading, executeResponseAction };
};
