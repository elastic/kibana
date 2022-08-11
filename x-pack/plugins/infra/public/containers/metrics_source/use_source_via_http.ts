/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import createContainer from 'constate';
import { HttpHandler } from '@kbn/core/public';
import { ToastInput } from '@kbn/core/public';
import {
  metricsSourceConfigurationResponseRT,
  MetricsSourceConfigurationResponse,
  MetricsSourceConfiguration,
} from '../../../common/metrics_sources';
import { useHTTPRequest } from '../../hooks/use_http_request';
import { throwErrors, createPlainError } from '../../../common/runtime_types';

export const pickIndexPattern = (
  source: MetricsSourceConfiguration | undefined,
  type: 'metrics'
) => {
  if (!source) {
    return 'unknown-index';
  }
  if (type === 'metrics') {
    return source.configuration.metricAlias;
  }
  return `${source.configuration.metricAlias}`;
};

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

  const createDerivedIndexPattern = useCallback(() => {
    return {
      fields: response?.source.status ? response.source.status.indexFields : [],
      title: pickIndexPattern(response?.source, 'metrics'),
    };
  }, [response]);

  const source = useMemo(() => {
    return response ? response.source : null;
  }, [response]);

  return {
    createDerivedIndexPattern,
    source,
    loading,
    error,
  };
};

export const SourceViaHttp = createContainer(useSourceViaHttp);
export const [SourceViaHttpProvider, useSourceViaHttpContext] = SourceViaHttp;
