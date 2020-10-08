/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect, useMemo, useCallback } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import createContainer from 'constate';
import { HttpHandler } from 'src/core/public';
import { ToastInput } from 'src/core/public';
import {
  SourceResponseRuntimeType,
  SourceResponse,
  InfraSource,
} from '../../../common/http_api/source_api';
import { useHTTPRequest } from '../../hooks/use_http_request';
import { throwErrors, createPlainError } from '../../../common/runtime_types';

export const pickIndexPattern = (
  source: InfraSource | undefined,
  type: 'logs' | 'metrics' | 'both'
) => {
  if (!source) {
    return 'unknown-index';
  }
  if (type === 'logs') {
    return source.configuration.logAlias;
  }
  if (type === 'metrics') {
    return source.configuration.metricAlias;
  }
  return `${source.configuration.logAlias},${source.configuration.metricAlias}`;
};

interface Props {
  sourceId: string;
  type: 'logs' | 'metrics' | 'both';
  fetch?: HttpHandler;
  toastWarning?: (input: ToastInput) => void;
}

export const useSourceViaHttp = ({
  sourceId = 'default',
  type = 'both',
  fetch,
  toastWarning,
}: Props) => {
  const decodeResponse = (response: any) => {
    return pipe(
      SourceResponseRuntimeType.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const { error, loading, response, makeRequest } = useHTTPRequest<SourceResponse>(
    `/api/metrics/source/${sourceId}/${type}`,
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

  const createDerivedIndexPattern = useCallback(
    (indexType: 'logs' | 'metrics' | 'both' = type) => {
      return {
        fields: response?.source ? response.status.indexFields : [],
        title: pickIndexPattern(response?.source, indexType),
      };
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [response, type]
  );

  const source = useMemo(() => {
    return response ? { ...response.source, status: response.status } : null;
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
