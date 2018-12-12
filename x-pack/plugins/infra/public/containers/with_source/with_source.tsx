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
import { SourceQuery } from '../../graphql/types';
import {
  createStatusActions,
  createStatusSelectors,
  Operation,
  OperationStatus,
  StatusHistoryUpdater,
} from '../../utils/operation_status';
import { inferActionMap, inferEffectMap, inferSelectorMap } from '../../utils/typed_constate';
import { RendererFunction } from '../../utils/typed_react';
import { sourceQuery } from './query_source.gql_query';

type Operations = Operation<'load', SourceQuery.Variables>;

interface State {
  operationStatusHistory: Array<OperationStatus<Operations>>;
  source: SourceQuery.Source | undefined;
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
    getConfiguredFields: () => state =>
      (state && state.source && state.source.configuration && state.source.configuration.fields) ||
      undefined,
    getLogIndicesExist: () => state =>
      (state && state.source && state.source.status && state.source.status.logIndicesExist) ||
      undefined,
    getMetricIndicesExist: () => state =>
      (state && state.source && state.source.status && state.source.status.metricIndicesExist) ||
      undefined,
    getDerivedIndexPattern: () => getDerivedIndexPattern,
  });

  const effects = inferEffectMap<State>()({
    load: () => ({ setState }) => {
      const variables = {
        sourceId,
      };

      setState(actions.startOperation({ name: 'load', parameters: variables }));

      apolloClient
        .query<SourceQuery.Query, SourceQuery.Variables>({
          query: sourceQuery,
          fetchPolicy: 'no-cache',
          variables,
        })
        .then(
          result =>
            setState(state => ({
              ...actions.finishOperation({ name: 'load', parameters: variables })(state),
              source: result.data.source,
            })),
          error =>
            setState(state => ({
              ...actions.failOperation({ name: 'load', parameters: variables }, `${error}`)(state),
            }))
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
    configuredFields?: SourceQuery.Fields;
    derivedIndexPattern: StaticIndexPattern;
    hasFailed: boolean;
    isLoading: boolean;
    lastFailureMessage?: string;
    load: () => void;
    logIndicesExist?: boolean;
    metricIndicesExist?: boolean;
  }>;
}

export const WithSource: React.SFC<WithSourceProps> = ({ children }) => (
  <ApolloConsumer>
    {client => (
      <ConstateContainer pure {...createContainerProps('default', client)}>
        {({
          getConfiguredFields,
          getDerivedIndexPattern,
          getHasFailed,
          getIsInProgress,
          getLastFailureMessage,
          getLogIndicesExist,
          getMetricIndicesExist,
          load,
        }) =>
          children({
            configuredFields: getConfiguredFields(),
            derivedIndexPattern: getDerivedIndexPattern(),
            hasFailed: getHasFailed(),
            isLoading: getIsInProgress(),
            lastFailureMessage: getLastFailureMessage(),
            load,
            logIndicesExist: getLogIndicesExist(),
            metricIndicesExist: getMetricIndicesExist(),
          })
        }
      </ConstateContainer>
    )}
  </ApolloConsumer>
);
