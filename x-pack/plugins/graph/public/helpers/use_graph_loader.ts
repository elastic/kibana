/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { ToastsStart } from '@kbn/core/public';
import { IHttpFetchError, ResponseErrorBody, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { ExploreRequest, GraphExploreCallback, GraphSearchCallback, SearchRequest } from '../types';
import { formatHttpError } from './format_http_error';

interface UseGraphLoaderProps {
  toastNotifications: ToastsStart;
  coreStart: CoreStart;
}

export const useGraphLoader = ({ toastNotifications, coreStart }: UseGraphLoaderProps) => {
  const [loading, setLoading] = useState(false);

  const handleHttpError = useCallback(
    (error: IHttpFetchError<ResponseErrorBody & { status: number; statusText: string }>) => {
      toastNotifications.addDanger(formatHttpError(error));
    },
    [toastNotifications]
  );

  const handleSearchQueryError = useCallback(
    (err: Error | string) => {
      const toastTitle = i18n.translate('xpack.graph.errorToastTitle', {
        defaultMessage: 'Graph Error',
        description: '"Graph" is a product name and should not be translated.',
      });
      if (err instanceof Error) {
        toastNotifications.addError(err, {
          title: toastTitle,
        });
      } else {
        toastNotifications.addDanger({
          title: toastTitle,
          text: String(err),
        });
      }
    },
    [toastNotifications]
  );

  // Replacement function for graphClientWorkspace's comms so
  // that it works with Kibana.
  const callNodeProxy = useCallback(
    (indexName: string, query: ExploreRequest, responseHandler: GraphExploreCallback) => {
      const request = {
        body: JSON.stringify({
          index: indexName,
          query,
        }),
      };
      setLoading(true);
      return coreStart.http
        .post<{ resp: { timed_out: unknown } }>('../api/graph/graphExplore', request)
        .then(function (data) {
          const response = data.resp;
          if (response?.timed_out) {
            toastNotifications.addWarning(
              i18n.translate('xpack.graph.exploreGraph.timedOutWarningText', {
                defaultMessage: 'Exploration timed out',
              })
            );
          }
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => setLoading(false));
    },
    [coreStart.http, handleHttpError, toastNotifications]
  );

  // Helper function for the graphClientWorkspace to perform a query
  const callSearchNodeProxy = useCallback(
    (indexName: string, query: SearchRequest, responseHandler: GraphSearchCallback) => {
      const request = {
        body: JSON.stringify({
          index: indexName,
          body: query,
        }),
      };
      setLoading(true);
      coreStart.http
        .post<{ resp: unknown }>('../api/graph/searchProxy', request)
        .then(function (data) {
          const response = data.resp;
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => setLoading(false));
    },
    [coreStart.http, handleHttpError]
  );

  return {
    loading,
    callNodeProxy,
    callSearchNodeProxy,
    handleSearchQueryError,
  };
};
