/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { ActionCreator } from 'typescript-fsa';
import { StaticIndexPattern } from 'ui/index_patterns';

import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import {
  KueryFilterQuery,
  networkModel,
  networkSelectors,
  SerializedFilterQuery,
  State,
} from '../../store';
import { networkActions } from '../../store/actions';

export interface NetworkFilterArgs {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraftFromKueryExpression: (expression: string) => void;
}

interface OwnProps {
  children: (args: NetworkFilterArgs) => React.ReactNode;
  indexPattern: StaticIndexPattern;
  type: networkModel.NetworkType;
}

interface NetworkFilterReduxProps {
  networkFilterQueryDraft: KueryFilterQuery;
  isNetworkFilterQueryDraftValid: boolean;
}

interface NetworkFilterDispatchProps {
  applyNetworkFilterQuery: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
  setNetworkFilterQueryDraft: ActionCreator<{
    filterQueryDraft: KueryFilterQuery;
    networkType: networkModel.NetworkType;
  }>;
}

export type NetworkFilterProps = OwnProps & NetworkFilterReduxProps & NetworkFilterDispatchProps;

const NetworkFilterComponent = pure<NetworkFilterProps>(
  ({
    applyNetworkFilterQuery,
    children,
    networkFilterQueryDraft,
    indexPattern,
    isNetworkFilterQueryDraftValid,
    setNetworkFilterQueryDraft,
    type,
  }) => (
    <>
      {children({
        applyFilterQueryFromKueryExpression: (expression: string) =>
          applyNetworkFilterQuery({
            filterQuery: {
              query: {
                kind: 'kuery',
                expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
            },
            networkType: type,
          }),
        filterQueryDraft: networkFilterQueryDraft,
        isFilterQueryDraftValid: isNetworkFilterQueryDraftValid,
        setFilterQueryDraftFromKueryExpression: (expression: string) =>
          setNetworkFilterQueryDraft({
            filterQueryDraft: {
              kind: 'kuery',
              expression,
            },
            networkType: type,
          }),
      })}
    </>
  )
);

const makeMapStateToProps = () => {
  const getNetworkFilterQueryDraft = networkSelectors.networkFilterQueryDraft();
  const getIsNetworkFilterQueryDraftValid = networkSelectors.isNetworkFilterQueryDraftValid();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return {
      networkFilterQueryDraft: getNetworkFilterQueryDraft(state, type),
      isNetworkFilterQueryDraftValid: getIsNetworkFilterQueryDraftValid(state, type),
    };
  };
  return mapStateToProps;
};

export const NetworkFilter = connect(
  makeMapStateToProps,
  {
    applyNetworkFilterQuery: networkActions.applyNetworkFilterQuery,
    setNetworkFilterQueryDraft: networkActions.setNetworkFilterQueryDraft,
  }
)(NetworkFilterComponent);
