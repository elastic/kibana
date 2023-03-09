/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useEffect, useState } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  MetricsSourceConfigurationResponse,
  MetricsSourceConfiguration,
  PartialMetricsSourceConfigurationProperties,
} from '../../../common/metrics_sources';

import { useTrackedPromise } from '../../utils/use_tracked_promise';
import {
  getSourceErrorToast,
  MissingHttpClientException,
  throwLoadSourceError,
} from './source_errors';

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
  const { services, notifications } = useKibana();

  const fetchService = services.http;
  const API_URL = `/api/metrics/source/${sourceId}`;

  const [source, setSource] = useState<MetricsSourceConfiguration | undefined>(undefined);

  const [loadSourceRequest, loadSource] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: () => {
        if (!fetchService) {
          throw new MissingHttpClientException();
        }

        return fetchService
          .fetch<MetricsSourceConfigurationResponse>(API_URL, { method: 'GET' })
          .catch(throwLoadSourceError);
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

        return await fetchService
          .patch<MetricsSourceConfigurationResponse>(API_URL, {
            method: 'PATCH',
            body: JSON.stringify(sourceProperties),
          })
          .catch(throwLoadSourceError);
      },
      onResolve: (response) => {
        if (response) {
          setSource(response.source);
        }
      },
      onReject: (error) => {
        if (error instanceof Error) {
          notifications.toasts.danger(getSourceErrorToast(error.message));
        }
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
