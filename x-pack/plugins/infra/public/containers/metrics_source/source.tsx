/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useEffect, useMemo, useState } from 'react';

import {
  MetricsSourceConfigurationResponse,
  MetricsSourceConfiguration,
  PartialMetricsSourceConfigurationProperties,
} from '../../../common/metrics_sources';

import { useTrackedPromise } from '../../utils/use_tracked_promise';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

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

const DEPENDENCY_ERROR_MESSAGE = 'Failed to load source: No fetch client available.';

export const useSource = ({ sourceId }: { sourceId: string }) => {
  const kibana = useKibana();
  const fetchService = kibana.services.http?.fetch;
  const API_URL = `/api/metrics/source/${sourceId}`;

  const [source, setSource] = useState<MetricsSourceConfiguration | undefined>(undefined);

  const [loadSourceRequest, loadSource] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!fetchService) {
          throw new Error(DEPENDENCY_ERROR_MESSAGE);
        }

        return await fetchService<MetricsSourceConfigurationResponse>(`${API_URL}`, {
          method: 'GET',
        });
      },
      onResolve: (response) => {
        setSource(response.source);
      },
    },
    [fetchService, sourceId]
  );

  const [createSourceConfigurationRequest, createSourceConfiguration] = useTrackedPromise(
    {
      createPromise: async (sourceProperties: PartialMetricsSourceConfigurationProperties) => {
        if (!fetchService) {
          throw new Error(DEPENDENCY_ERROR_MESSAGE);
        }

        return await fetchService<MetricsSourceConfigurationResponse>(API_URL, {
          method: 'PATCH',
          body: JSON.stringify(sourceProperties),
        });
      },
      onResolve: (response) => {
        if (response) {
          setSource(response.source);
        }
      },
    },
    [fetchService, sourceId]
  );

  const [updateSourceConfigurationRequest, updateSourceConfiguration] = useTrackedPromise(
    {
      createPromise: async (sourceProperties: PartialMetricsSourceConfigurationProperties) => {
        if (!fetchService) {
          throw new Error(DEPENDENCY_ERROR_MESSAGE);
        }

        return await fetchService<MetricsSourceConfigurationResponse>(API_URL, {
          method: 'PATCH',
          body: JSON.stringify(sourceProperties),
        });
      },
      onResolve: (response) => {
        if (response) {
          setSource(response.source);
        }
      },
    },
    [fetchService, sourceId]
  );

  const createDerivedIndexPattern = () => {
    return {
      fields: source?.status ? source.status.indexFields : [],
      title: pickIndexPattern(source, 'metrics'),
    };
  };

  const isLoading = useMemo(
    () =>
      [
        loadSourceRequest.state,
        createSourceConfigurationRequest.state,
        updateSourceConfigurationRequest.state,
      ].some((state) => state === 'pending'),
    [
      loadSourceRequest.state,
      createSourceConfigurationRequest.state,
      updateSourceConfigurationRequest.state,
    ]
  );

  const isUninitialized = useMemo(
    () => loadSourceRequest.state === 'uninitialized',
    [loadSourceRequest.state]
  );

  const sourceExists = useMemo(() => (source ? !!source.version : undefined), [source]);

  const metricIndicesExist = useMemo(
    () => source && source.status && source.status.metricIndicesExist,
    [source]
  );

  useEffect(() => {
    loadSource();
  }, [loadSource, sourceId]);

  return {
    createSourceConfiguration,
    createDerivedIndexPattern,
    isLoading,
    isLoadingSource: loadSourceRequest.state === 'pending',
    isUninitialized,
    hasFailedLoadingSource: loadSourceRequest.state === 'rejected',
    loadSource,
    loadSourceFailureMessage:
      loadSourceRequest.state === 'rejected' ? `${loadSourceRequest.value}` : undefined,
    metricIndicesExist,
    source,
    sourceExists,
    sourceId,
    updateSourceConfiguration,
    version: source && source.version ? source.version : undefined,
  };
};

export const Source = createContainer(useSource);
export const [SourceProvider, useSourceContext] = Source;
