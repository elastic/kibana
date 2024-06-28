/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import React, { useEffect, useState } from 'react';

import { IHttpFetchError } from '@kbn/core-http-browser';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type {
  MetricsSourceConfigurationResponse,
  MetricsSourceConfiguration,
  PartialMetricsSourceConfigurationProperties,
} from '../../../common/metrics_sources';

import { useTrackedPromise } from '../../utils/use_tracked_promise';
import { MissingHttpClientException } from './source_errors';
import { useSourceNotifier } from './notifications';
import { MetricsDataViewProvider } from './metrics_view';

const API_URL = `/api/metrics/source`;

export const useSourceFetcher = ({ sourceId }: { sourceId: string }) => {
  const [source, setSource] = useState<MetricsSourceConfiguration | undefined>(undefined);
  const {
    services: { http, telemetry },
  } = useKibanaContextForPlugin();
  const notify = useSourceNotifier();

  const [loadSourceRequest, loadSource] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!http) {
          throw new MissingHttpClientException();
        }

        const start = performance.now();
        const response = await http.fetch<MetricsSourceConfigurationResponse>(
          `${API_URL}/${sourceId}`,
          {
            method: 'GET',
          }
        );
        telemetry?.reportPerformanceMetricEvent(
          'infra_source_load',
          performance.now() - start,
          {},
          {}
        );
        return response;
      },
      onResolve: (response) => {
        if (response) {
          setSource(response.source);
        }
      },
    },
    [http, sourceId]
  );

  const [persistSourceConfigurationRequest, persistSourceConfiguration] = useTrackedPromise(
    {
      createPromise: async (sourceProperties: PartialMetricsSourceConfigurationProperties) => {
        if (!http) {
          throw new MissingHttpClientException();
        }

        return await http.patch<MetricsSourceConfigurationResponse>(`${API_URL}/${sourceId}`, {
          method: 'PATCH',
          body: JSON.stringify(sourceProperties),
        });
      },
      onResolve: (response) => {
        if (response) {
          notify.updateSuccess();
          setSource(response.source);
        }
      },
      onReject: (error) => {
        notify.updateFailure((error as IHttpFetchError<{ message: string }>).body?.message);
      },
    },
    [http, sourceId]
  );

  useEffect(() => {
    loadSource();
  }, [loadSource, sourceId]);

  const error = loadSourceRequest.state === 'rejected' ? `${loadSourceRequest.value}` : undefined;
  const isLoading =
    loadSourceRequest.state === 'uninitialized' ||
    loadSourceRequest.state === 'pending' ||
    persistSourceConfigurationRequest.state === 'pending';

  return {
    error,
    loadSource,
    isLoading,
    source,
    persistSourceConfiguration,
  };
};

export const useSource = ({ sourceId }: { sourceId: string }) => {
  const { persistSourceConfiguration, source, error, isLoading, loadSource } = useSourceFetcher({
    sourceId,
  });

  const sourceExists = source ? !!source.version : undefined;

  const metricIndicesExist = Boolean(source?.status?.metricIndicesExist);

  return {
    isLoading,
    error,
    loadSource,
    metricIndicesExist,
    source,
    sourceExists,
    sourceId,
    persistSourceConfiguration,
  };
};

export const [SourceProvider, useSourceContext] = createContainer(useSource);

export const withSourceProvider =
  <ComponentProps extends {}>(Component: React.FC<ComponentProps>) =>
  (sourceId = 'default') => {
    return function ComponentWithSourceProvider(props: ComponentProps) {
      return (
        <SourceProvider sourceId={sourceId}>
          <MetricsDataViewProvider>
            <Component {...props} />
          </MetricsDataViewProvider>
        </SourceProvider>
      );
    };
  };
