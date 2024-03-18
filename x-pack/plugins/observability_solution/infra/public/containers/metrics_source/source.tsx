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

export const useSource = ({ sourceId }: { sourceId: string }) => {
  const {
    services: { http, telemetry },
  } = useKibanaContextForPlugin();

  const notify = useSourceNotifier();

  const fetchService = http;
  const API_URL = `/api/metrics/source/${sourceId}`;

  const [source, setSource] = useState<MetricsSourceConfiguration | undefined>(undefined);

  const [loadSourceRequest, loadSource] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!fetchService) {
          throw new MissingHttpClientException();
        }

        const start = performance.now();
        const response = await fetchService.fetch<MetricsSourceConfigurationResponse>(API_URL, {
          method: 'GET',
        });
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
    [fetchService, sourceId]
  );

  const [createSourceConfigurationRequest, createSourceConfiguration] = useTrackedPromise(
    {
      createPromise: async (sourceProperties: PartialMetricsSourceConfigurationProperties) => {
        if (!fetchService) {
          throw new MissingHttpClientException();
        }

        return await fetchService.patch<MetricsSourceConfigurationResponse>(API_URL, {
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
    [fetchService, sourceId]
  );

  useEffect(() => {
    loadSource();
  }, [loadSource, sourceId]);

  const createDerivedIndexPattern = () => {
    return {
      fields: source?.status ? source.status.indexFields : [],
      title: pickIndexPattern(source, 'metrics'),
    };
  };

  const hasFailedLoadingSource = loadSourceRequest.state === 'rejected';
  const isUninitialized = loadSourceRequest.state === 'uninitialized';
  const isLoadingSource = loadSourceRequest.state === 'pending';
  const isLoading = isLoadingSource || createSourceConfigurationRequest.state === 'pending';

  const sourceExists = source ? !!source.version : undefined;

  const metricIndicesExist = Boolean(source?.status?.metricIndicesExist);

  const version = source?.version;

  return {
    createSourceConfiguration,
    createDerivedIndexPattern,
    isLoading,
    isLoadingSource,
    isUninitialized,
    hasFailedLoadingSource,
    loadSource,
    loadSourceRequest,
    loadSourceFailureMessage: hasFailedLoadingSource ? `${loadSourceRequest.value}` : undefined,
    metricIndicesExist,
    source,
    sourceExists,
    sourceId,
    updateSourceConfiguration: createSourceConfiguration,
    version,
  };
};

export const [SourceProvider, useSourceContext] = createContainer(useSource);

export const withSourceProvider =
  <ComponentProps,>(Component: React.FunctionComponent<ComponentProps>) =>
  (sourceId = 'default') => {
    return function ComponentWithSourceProvider(props: ComponentProps) {
      return (
        <SourceProvider sourceId={sourceId}>
          {/* @ts-expect-error upgrade typescript v4.9.5*/}
          <Component {...props} />
        </SourceProvider>
      );
    };
  };
