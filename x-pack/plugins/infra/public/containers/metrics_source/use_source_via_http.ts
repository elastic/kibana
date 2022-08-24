/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpHandler, ToastInput } from '@kbn/core/public';
import createContainer from 'constate';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useEffect, useMemo } from 'react';
import {
  MetricsSourceConfigurationResponse,
  metricsSourceConfigurationResponseRT,
} from '../../../common/metrics_sources';
import { createPlainError, throwErrors } from '../../../common/runtime_types';
import { useHTTPRequest } from '../../hooks/use_http_request';

interface Props {
  sourceId: string;
  fetch?: HttpHandler;
  toastWarning?: (input: ToastInput) => void;
}

export const useSourceViaHttp = ({ sourceId = 'default', fetch, toastWarning }: Props) => {
  const decodeResponse = (response: any) => {
    return pipe(
      metricsSourceConfigurationResponseRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } =
    useHTTPRequest<MetricsSourceConfigurationResponse>(
      `/api/metrics/source/${sourceId}`,
      'GET',
      null,
      decodeResponse,
      fetch,
      toastWarning
    );

  useEffect(() => {
    (async () => {
      await makeRequest();
    })();
  }, [makeRequest]);

  const source = useMemo(() => {
    return response ? response.source : null;
  }, [response]);

  return {
    source,
    loading,
    error,
  };
};

export const SourceViaHttp = createContainer(useSourceViaHttp);
export const [SourceViaHttpProvider, useSourceViaHttpContext] = SourceViaHttp;
