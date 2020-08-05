/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import createContainer from 'constate';
import { useEffect, useMemo, useState } from 'react';

import {
  CreateSourceConfigurationMutation,
  SourceQuery,
  UpdateSourceInput,
  UpdateSourceMutation,
} from '../../graphql/types';
import { DependencyError, useApolloClient } from '../../utils/apollo_context';
import { useTrackedPromise } from '../../utils/use_tracked_promise';
import { createSourceMutation } from './create_source.gql_query';
import { sourceQuery } from './query_source.gql_query';
import { updateSourceMutation } from './update_source.gql_query';

type Source = SourceQuery.Query['source'];

export const pickIndexPattern = (source: Source | undefined, type: 'logs' | 'metrics' | 'both') => {
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

export const useSource = ({ sourceId }: { sourceId: string }) => {
  const apolloClient = useApolloClient();
  const [source, setSource] = useState<Source | undefined>(undefined);

  const [loadSourceRequest, loadSource] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (!apolloClient) {
          throw new DependencyError('Failed to load source: No apollo client available.');
        }

        return await apolloClient.query<SourceQuery.Query, SourceQuery.Variables>({
          fetchPolicy: 'no-cache',
          query: sourceQuery,
          variables: {
            sourceId,
          },
        });
      },
      onResolve: (response) => {
        setSource(response.data.source);
      },
    },
    [apolloClient, sourceId]
  );

  const [createSourceConfigurationRequest, createSourceConfiguration] = useTrackedPromise(
    {
      createPromise: async (sourceProperties: UpdateSourceInput) => {
        if (!apolloClient) {
          throw new DependencyError(
            'Failed to create source configuration: No apollo client available.'
          );
        }

        return await apolloClient.mutate<
          CreateSourceConfigurationMutation.Mutation,
          CreateSourceConfigurationMutation.Variables
        >({
          mutation: createSourceMutation,
          fetchPolicy: 'no-cache',
          variables: {
            sourceId,
            sourceProperties,
          },
        });
      },
      onResolve: (response) => {
        if (response.data) {
          setSource(response.data.createSource.source);
        }
      },
    },
    [apolloClient, sourceId]
  );

  const [updateSourceConfigurationRequest, updateSourceConfiguration] = useTrackedPromise(
    {
      createPromise: async (sourceProperties: UpdateSourceInput) => {
        if (!apolloClient) {
          throw new DependencyError(
            'Failed to update source configuration: No apollo client available.'
          );
        }

        return await apolloClient.mutate<
          UpdateSourceMutation.Mutation,
          UpdateSourceMutation.Variables
        >({
          mutation: updateSourceMutation,
          fetchPolicy: 'no-cache',
          variables: {
            sourceId,
            sourceProperties,
          },
        });
      },
      onResolve: (response) => {
        if (response.data) {
          setSource(response.data.updateSource.source);
        }
      },
    },
    [apolloClient, sourceId]
  );

  const createDerivedIndexPattern = (type: 'logs' | 'metrics' | 'both') => {
    return {
      fields: source ? source.status.indexFields : [],
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
