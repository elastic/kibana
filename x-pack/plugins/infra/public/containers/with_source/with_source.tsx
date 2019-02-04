/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient } from 'apollo-client';
import { Container as ConstateContainer, OnMount } from 'constate';
import React from 'react';
import { ApolloConsumer } from 'react-apollo';
import { createSelector } from 'reselect';

import { StaticIndexPattern } from 'ui/index_patterns';
import { memoizeLast } from 'ui/utils/memoize';
import {
  CreateSourceInput,
  CreateSourceMutation,
  SourceQuery,
  UpdateSourceInput,
  UpdateSourceMutation,
} from '../../graphql/types';
import {
  createStatusActions,
  createStatusSelectors,
  Operation,
  OperationStatus,
  StatusHistoryUpdater,
} from '../../utils/operation_status';
import { inferActionMap, inferEffectMap, inferSelectorMap } from '../../utils/typed_constate';
import { RendererFunction } from '../../utils/typed_react';
import { createSourceMutation } from './create_source.gql_query';
import { sourceQuery } from './query_source.gql_query';
import { updateSourceMutation } from './update_source.gql_query';

type Operations =
  | Operation<'create', CreateSourceMutation.Variables>
  | Operation<'load', SourceQuery.Variables>
  | Operation<'update', UpdateSourceMutation.Variables>;

interface State {
  operationStatusHistory: Array<OperationStatus<Operations>>;
  source: SourceQuery.Query['source'] | undefined;
}

const createContainerProps = memoizeLast((sourceId: string, apolloClient: ApolloClient<any>) => {
  const initialState: State = {
    operationStatusHistory: [],
    source: undefined,
  };

  const actions = inferActionMap<State>()({
    ...createStatusActions((updater: StatusHistoryUpdater<Operations>) => (state: State) => ({
      ...state,
      operationStatusHistory: updater(state.operationStatusHistory),
    })),
  });

  const getDerivedIndexPattern = createSelector(
    (state: State) =>
      (state && state.source && state.source.status && state.source.status.indexFields) || [],
    (state: State) =>
      (state &&
        state.source &&
        state.source.configuration &&
        state.source.configuration.logAlias) ||
      undefined,
    (state: State) =>
      (state &&
        state.source &&
        state.source.configuration &&
        state.source.configuration.metricAlias) ||
      undefined,
    (indexFields, logAlias, metricAlias) => ({
      fields: indexFields,
      title: `${logAlias},${metricAlias}`,
    })
  );

  const selectors = inferSelectorMap<State>()({
    ...createStatusSelectors(({ operationStatusHistory }: State) => operationStatusHistory),
    getConfiguration: () => state =>
      (state && state.source && state.source.configuration) || undefined,
    getSourceId: () => () => sourceId,
    getLogIndicesExist: () => state =>
      (state && state.source && state.source.status && state.source.status.logIndicesExist) ||
      undefined,
    getMetricIndicesExist: () => state =>
      (state && state.source && state.source.status && state.source.status.metricIndicesExist) ||
      undefined,
    getDerivedIndexPattern: () => getDerivedIndexPattern,
    getVersion: () => state => (state && state.source && state.source.version) || undefined,
    getExists: () => state =>
      (state && state.source && typeof state.source.version === 'number') || false,
  });

  const effects = inferEffectMap<State>()({
    create: (sourceConfiguration: CreateSourceInput) => ({ setState }) => {
      const variables = {
        sourceId,
        sourceConfiguration,
      };

      setState(actions.startOperation({ name: 'create', parameters: variables }));

      return apolloClient
        .mutate<CreateSourceMutation.Mutation, CreateSourceMutation.Variables>({
          mutation: createSourceMutation,
          fetchPolicy: 'no-cache',
          variables,
        })
        .then(
          result => {
            setState(state => ({
              ...actions.finishOperation({ name: 'create', parameters: variables })(state),
              source: result.data ? result.data.createSource.source : state.source,
            }));
            return result;
          },
          error => {
            setState(state => ({
              ...actions.failOperation({ name: 'create', parameters: variables }, `${error}`)(
                state
              ),
            }));
            throw error;
          }
        );
    },
    load: () => ({ setState }) => {
      const variables = {
        sourceId,
      };

      setState(actions.startOperation({ name: 'load', parameters: variables }));

      return apolloClient
        .query<SourceQuery.Query, SourceQuery.Variables>({
          query: sourceQuery,
          fetchPolicy: 'no-cache',
          variables,
        })
        .then(
          result => {
            setState(state => ({
              ...actions.finishOperation({ name: 'load', parameters: variables })(state),
              source: result.data.source,
            }));
            return result;
          },
          error => {
            setState(state => ({
              ...actions.failOperation({ name: 'load', parameters: variables }, `${error}`)(state),
            }));
            throw error;
          }
        );
    },
    update: (changes: UpdateSourceInput[]) => ({ setState }) => {
      const variables = {
        sourceId,
        changes,
      };

      setState(actions.startOperation({ name: 'update', parameters: variables }));

      return apolloClient
        .mutate<UpdateSourceMutation.Mutation, UpdateSourceMutation.Variables>({
          mutation: updateSourceMutation,
          fetchPolicy: 'no-cache',
          variables,
        })
        .then(
          result => {
            setState(state => ({
              ...actions.finishOperation({ name: 'update', parameters: variables })(state),
              source: result.data ? result.data.updateSource.source : state.source,
            }));
            return result;
          },
          error => {
            setState(state => ({
              ...actions.failOperation({ name: 'update', parameters: variables }, `${error}`)(
                state
              ),
            }));
            throw error;
          }
        );
    },
  });

  const onMount: OnMount<State> = props => {
    effects.load()(props);
  };

  return {
    actions,
    context: `source-${sourceId}`,
    effects,
    initialState,
    key: `source-${sourceId}`,
    onMount,
    selectors,
  };
});

interface WithSourceProps {
  children: RendererFunction<{
    configuration?: SourceQuery.Query['source']['configuration'];
    create: (sourceConfiguration: CreateSourceInput) => Promise<any>;
    derivedIndexPattern: StaticIndexPattern;
    exists: boolean;
    hasFailed: boolean;
    isLoading: boolean;
    lastFailureMessage?: string;
    load: () => Promise<any>;
    logIndicesExist?: boolean;
    metricAlias?: string;
    metricIndicesExist?: boolean;
    sourceId: string;
    update: (changes: UpdateSourceInput[]) => Promise<any>;
    version?: number;
  }>;
}

export const WithSource: React.SFC<WithSourceProps> = ({ children }) => (
  <ApolloConsumer>
    {client => (
      <ConstateContainer {...createContainerProps('default', client)}>
        {({
          create,
          getConfiguration,
          getDerivedIndexPattern,
          getExists,
          getHasFailed,
          getIsInProgress,
          getLastFailureMessage,
          getLogIndicesExist,
          getMetricIndicesExist,
          getSourceId,
          getVersion,
          load,
          update,
        }) =>
          children({
            create,
            configuration: getConfiguration(),
            derivedIndexPattern: getDerivedIndexPattern(),
            exists: getExists(),
            hasFailed: getHasFailed(),
            isLoading: getIsInProgress(),
            lastFailureMessage: getLastFailureMessage(),
            load,
            logIndicesExist: getLogIndicesExist(),
            metricIndicesExist: getMetricIndicesExist(),
            sourceId: getSourceId(),
            update,
            version: getVersion(),
          })
        }
      </ConstateContainer>
    )}
  </ApolloConsumer>
);
