/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { IHttpFetchError } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { HttpHandler } from 'src/core/public';
import { ToastInput } from 'src/core/public';
import { useTrackedPromise, CanceledPromiseError } from '../utils/use_tracked_promise';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

export function useHTTPRequest<Response>(
  pathname: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD',
  body?: string | null,
  decode: (response: any) => Response = (response) => response,
  fetch?: HttpHandler,
  toastWarning?: (input: ToastInput) => void
) {
  const kibana = useKibana();
  const fetchService = fetch ? fetch : kibana.services.http?.fetch;
  const toast = toastWarning ? toastWarning : kibana.notifications.toasts.warning;
  const [response, setResponse] = useState<Response | null>(null);
  const [error, setError] = useState<IHttpFetchError | null>(null);
  const [request, makeRequest] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: () => {
        if (!fetchService) {
          throw new Error('HTTP service is unavailable');
        }
        return fetchService(pathname, {
          method,
          body,
        });
      },
      onResolve: (resp) => setResponse(decode(resp)),
      onReject: (e: unknown) => {
        const err = e as IHttpFetchError;
        if (e && e instanceof CanceledPromiseError) {
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
                </>
              ) : (
                <h5>{err.message}</h5>
              )}
            </div>
          ),
        });
      },
    },
    [pathname, body, method, fetch, toast]
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
