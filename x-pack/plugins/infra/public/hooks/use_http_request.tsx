/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { HttpHandler } from '@kbn/core/public';
import { ToastInput } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { useTrackedPromise, CanceledPromiseError } from '../utils/use_tracked_promise';
import { InfraHttpError } from '../types';

export function useHTTPRequest<Response>(
  pathname: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
  body?: string | null,
  decode: (response: any) => Response = (response) => response,
  fetch?: HttpHandler,
  toastDanger?: (input: ToastInput) => void,
  abortable = false
) {
  const kibana = useKibana();
  const fetchService = fetch ? fetch : kibana.services.http?.fetch;
  const toast = toastDanger ? toastDanger : kibana.notifications.toasts.danger;
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<InfraHttpError | null>(null);
  const abortController = useRef(new AbortController());

  const onError = useCallback(
    (e: unknown) => {
      const err = e as InfraHttpError;
      if (e && (e instanceof CanceledPromiseError || (e as Error).name === AbortError.name)) {
        return;
      }
      setError(err);
      toast({
        toastLifeTimeMs: 3000,
        title: i18n.translate('xpack.infra.useHTTPRequest.error.title', {
          defaultMessage: `Error while fetching resource`,
        }),
        body: (
          <div>
            {err.response ? (
              <>
                <h5>
                  {i18n.translate('xpack.infra.useHTTPRequest.error.status', {
                    defaultMessage: `Error`,
                  })}
                </h5>
                {err.response?.statusText} ({err.response?.status})
                <h5>
                  {i18n.translate('xpack.infra.useHTTPRequest.error.url', {
                    defaultMessage: `URL`,
                  })}
                </h5>
                {err.response?.url}
                <h5>
                  {i18n.translate('xpack.infra.useHTTPRequest.error.body.message', {
                    defaultMessage: `Message`,
                  })}
                </h5>
                {err.body?.message || err.message}
              </>
            ) : (
              <h5>{err.body?.message || err.message}</h5>
            )}
          </div>
        ),
      });
    },
    [toast]
  );

  useEffect(() => {
    return () => {
      if (abortable) {
        abortController.current.abort();
      }
    };
  }, [abortable]);

  const [request, makeRequest] = useTrackedPromise<any, Response>(
    {
      cancelPreviousOn: 'resolution',
      createPromise: () => {
        if (!fetchService) {
          throw new Error('HTTP service is unavailable');
        }

        if (abortable) {
          abortController.current.abort();
        }

        abortController.current = new AbortController();

        return fetchService(pathname, {
          signal: abortController.current.signal,
          method,
          body,
        });
      },
      onResolve: (resp) => {
        try {
          setResponse(decode(resp)); // Catch decoding errors
        } catch (e) {
          onError(e);
        }
      },
      onReject: (e: unknown) => {
        onError(e);
      },
    },
    [pathname, body, method, fetch, toast, onError]
  );

  const loading = useMemo(() => {
    if (request.state === 'resolved' && response === null) {
      return true;
    }
    return request.state === 'pending';
  }, [request.state, response]);

  return {
    response,
    error,
    loading,
    makeRequest,
  };
}
