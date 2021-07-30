/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart, IHttpFetchError, ToastsStart } from 'kibana/public';
import {
  ExploreRequest,
  GraphExploreCallback,
  GraphSearchCallback,
  SearchRequest,
} from '../../types';
import { formatHttpError } from '../../helpers/format_http_error';

interface UseNodeProxyProps {
  coreStart: CoreStart;
  toastNotifications: ToastsStart;
}

export const useNodeProxy = ({ coreStart, toastNotifications }: UseNodeProxyProps) => {
  const [loading, setLoading] = useState(false);

  const handleHttpError = useCallback(
    (error: IHttpFetchError) => {
      toastNotifications.addDanger(formatHttpError(error));
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
        .post('../api/graph/graphExplore', request)
        .then(function (data) {
          const response = data.resp;
          if (response.timed_out) {
            toastNotifications.addWarning(
              i18n.translate('xpack.graph.exploreGraph.timedOutWarningText', {
                defaultMessage: 'Exploration timed out',
              })
            );
          }
          responseHandler(response);
        })
        .catch(handleHttpError)
        .finally(() => {
          setLoading(false);
          // $scope.$digest();
        });
    },
    [handleHttpError, coreStart.http, toastNotifications]
  );

  // Helper function for the graphClientWorkspace to perform a query
  const callSearchNodeProxy = function (
    indexName: string,
    query: SearchRequest,
    responseHandler: GraphSearchCallback
  ) {
    const request = {
      body: JSON.stringify({
        index: indexName,
        body: query,
      }),
    };
    setLoading(true);
    coreStart.http
      .post('../api/graph/searchProxy', request)
      .then(function (data) {
        const response = data.resp;
        responseHandler(response);
      })
      .catch(handleHttpError)
      .finally(() => {
        setLoading(false);
        // $scope.$digest();
      });
  };

  return { loading, callNodeProxy, callSearchNodeProxy };
};
