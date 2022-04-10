/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import { ActionTypeExecutorResult } from '../../../../../plugins/actions/common';
import { useKibana } from '../../common/lib/kibana';
import { executeAction } from '../lib/action_connector_api';

interface UseSubActionParams {
  connectorId: string;
  subAction: string;
  subActionParams: Record<string, unknown>;
}

export const useSubAction = <T,>({
  connectorId,
  subAction,
  subActionParams,
}: UseSubActionParams) => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<T | undefined>(undefined);
  const abortCtrl = useRef(new AbortController());
  const isMounted = useRef(false);

  async function executeSubAction() {
    abortCtrl.current = new AbortController();

    try {
      setIsLoading(true);
      setIsError(false);
      const res = (await executeAction({
        id: connectorId,
        http,
        params: {
          subAction,
          subActionParams,
        },
      })) as ActionTypeExecutorResult<T>;

      if (isMounted.current) {
        setIsLoading(false);
        setResponse(res.data);
        if (res.status && res.status === 'error') {
          setIsError(true);
          setError(new Error(`${res.message}: ${res.serviceMessage}`));
        }
      }

      return res.data;
    } catch (e) {
      if (isMounted.current) {
        setIsLoading(false);
        setIsError(true);
        setError(e);
      }
    }
  }

  useEffect(() => {
    isMounted.current = true;
    executeSubAction();
    return () => {
      isMounted.current = false;
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isLoading,
    response,
    isError,
    error,
  };
};
