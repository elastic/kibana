/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CoreStart, ToastsStart } from '@kbn/core/public';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RequestAdapter } from '@kbn/inspector-plugin/public';
import type {
  ExploreRequest,
  GraphExploreCallback,
  GraphSearchCallback,
  SearchRequest,
} from '../types';
import { formatHttpError } from './format_http_error';

interface UseGraphLoaderProps {
  toastNotifications: ToastsStart;
  coreStart: CoreStart;
}

export const useGraphLoader = ({ toastNotifications, coreStart }: UseGraphLoaderProps) => {
  const [loading, setLoading] = useState(false);
  const requestAdapter = useMemo(() => new RequestAdapter(), []);

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

  const getRequestInspector = useCallback(
    (indexName: string) => {
      const inspectRequest = requestAdapter.start(
        i18n.translate('xpack.graph.inspectAdapter.graphExploreRequest.name', {
          defaultMessage: 'Data',
        }),
        {
          description: i18n.translate(
            'xpack.graph.inspectAdapter.graphExploreRequest.description',
            {
              defaultMessage: 'This request queries Elasticsearch to fetch the data for the Graph.',
            }
          ),
        }
      );
      inspectRequest.stats({
        indexPattern: {
          label: i18n.translate(
            'xpack.graph.inspectAdapter.graphExploreRequest.dataView.description.label',
            { defaultMessage: 'Data view' }
          ),
          value: indexName,
          description: i18n.translate(
            'xpack.graph.inspectAdapter.graphExploreRequest.dataView.description',
            { defaultMessage: 'The data view that connected to the Elasticsearch indices.' }
          ),
        },
      });
      return inspectRequest;
    },
    [requestAdapter]
  );

  // Replacement function for graphClientWorkspace's comms so
  // that it works with Kibana.
  const callNodeProxy = useCallback(
    (indexName: string, query: ExploreRequest, responseHandler: GraphExploreCallback) => {
      const dsl = { index: indexName, query };
      const request = { body: JSON.stringify(dsl) };
      setLoading(true);

      requestAdapter.reset();
      const inspectRequest = getRequestInspector(indexName);
      inspectRequest.json(dsl);

      return coreStart.http
        .post<{ resp: estypes.GraphExploreResponse }>('../api/graph/graphExplore', request)
        .then(function (data) {
          const response = data.resp;

          if (response?.timed_out) {
            toastNotifications.addWarning(
              i18n.translate('xpack.graph.exploreGraph.timedOutWarningText', {
                defaultMessage: 'Exploration timed out',
              })
            );
          }
          inspectRequest.stats({}).ok({ json: response });
          responseHandler(response);
        })
        .catch((e) => {
          inspectRequest.error({ json: e });
          handleHttpError(e);
        })
        .finally(() => setLoading(false));
    },
    [coreStart.http, getRequestInspector, handleHttpError, requestAdapter, toastNotifications]
  );

  // Helper function for the graphClientWorkspace to perform a query
  const callSearchNodeProxy = useCallback(
    (indexName: string, query: SearchRequest, responseHandler: GraphSearchCallback) => {
      const dsl = { index: indexName, body: query };
      const request = { body: JSON.stringify(dsl) };
      setLoading(true);

      requestAdapter.reset();
      const inspectRequest = getRequestInspector(indexName);
      inspectRequest.json(dsl);

      coreStart.http
        .post<{ resp: estypes.GraphExploreResponse }>('../api/graph/searchProxy', request)
        .then(function (data) {
          const response = data.resp;
          inspectRequest.stats({}).ok({ json: response });
          responseHandler(response);
        })
        .catch((e) => {
          inspectRequest.error({ json: e });
          handleHttpError(e);
        })
        .finally(() => setLoading(false));
    },
    [coreStart.http, getRequestInspector, handleHttpError, requestAdapter]
  );

  return {
    loading,
    requestAdapter,
    callNodeProxy,
    callSearchNodeProxy,
    handleSearchQueryError,
  };
};
