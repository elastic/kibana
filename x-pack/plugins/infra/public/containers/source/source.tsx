/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useEffect, useMemo, useState } from 'react';

import {
  InfraSavedSourceConfiguration,
  InfraSource,
  SourceResponse,
} from '../../../common/http_api/source_api';
import { useTrackedPromise } from '../../utils/use_tracked_promise';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

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

const DEPENDENCY_ERROR_MESSAGE = 'Failed to load source: No fetch client available.';

export const useSource = ({ sourceId }: { sourceId: string }) => {
  const kibana = useKibana();
  const fetchService = kibana.services.http?.fetch;
  const API_URL = `/api/metrics/source/${sourceId}`;

  const [source, setSource] = useState<InfraSource | undefined>(undefined);

  const [loadSourceRequest, loadSource] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!fetchService) {
          throw new Error(DEPENDENCY_ERROR_MESSAGE);
        }

        return await fetchService<SourceResponse>(`${API_URL}/metrics`, {
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
      createPromise: async (sourceProperties: InfraSavedSourceConfiguration) => {
        if (!fetchService) {
          throw new Error(DEPENDENCY_ERROR_MESSAGE);
        }

        return await fetchService<SourceResponse>(API_URL, {
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
      createPromise: async (sourceProperties: InfraSavedSourceConfiguration) => {
        if (!fetchService) {
          throw new Error(DEPENDENCY_ERROR_MESSAGE);
        }

        return await fetchService<SourceResponse>(API_URL, {
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

  const createDerivedIndexPattern = (type: 'logs' | 'metrics' | 'both') => {
    return {
      fields: source?.status ? source.status.indexFields : [],
      title: pickIndexPattern(source, type),
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

  const isUninitialized = useMemo(() => loadSourceRequest.state === 'uninitialized', [
    loadSourceRequest.state,
  ]);

  const sourceExists = useMemo(() => (source ? !!source.version : undefined), [source]);

  const logIndicesExist = useMemo(() => source && source.status && source.status.logIndicesExist, [
    source,
  ]);
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
    logIndicesExist,
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
