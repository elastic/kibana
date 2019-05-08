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
  hostsModel,
  hostsSelectors,
  KueryFilterQuery,
  SerializedFilterQuery,
  State,
} from '../../store';
import { hostsActions } from '../../store/actions';

export interface HostsFilterArgs {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraftFromKueryExpression: (expression: string) => void;
}

interface OwnProps {
  children: (args: HostsFilterArgs) => React.ReactNode;
  indexPattern: StaticIndexPattern;
  type: hostsModel.HostsType;
}

interface HostsFilterReduxProps {
  hostsFilterQueryDraft: KueryFilterQuery;
  isHostFilterQueryDraftValid: boolean;
}

interface HostsFilterDispatchProps {
  applyHostsFilterQuery: ActionCreator<{
    filterQuery: SerializedFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
  setHostsFilterQueryDraft: ActionCreator<{
    filterQueryDraft: KueryFilterQuery;
    hostsType: hostsModel.HostsType;
  }>;
}

export type HostsFilterProps = OwnProps & HostsFilterReduxProps & HostsFilterDispatchProps;

const HostsFilterComponent = pure<HostsFilterProps>(
  ({
    applyHostsFilterQuery,
    children,
    hostsFilterQueryDraft,
    indexPattern,
    isHostFilterQueryDraftValid,
    setHostsFilterQueryDraft,
    type,
  }) => (
    <>
      {children({
        applyFilterQueryFromKueryExpression: (expression: string) =>
          applyHostsFilterQuery({
            filterQuery: {
              query: {
                kind: 'kuery',
                expression,
              },
              serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
            },
            hostsType: type,
          }),
        filterQueryDraft: hostsFilterQueryDraft,
        isFilterQueryDraftValid: isHostFilterQueryDraftValid,
        setFilterQueryDraftFromKueryExpression: (expression: string) =>
          setHostsFilterQueryDraft({
            filterQueryDraft: {
              kind: 'kuery',
              expression,
            },
            hostsType: type,
          }),
      })}
    </>
  )
);

const makeMapStateToProps = () => {
  const getHostsFilterQueryDraft = hostsSelectors.hostsFilterQueryDraft();
  const getIsHostFilterQueryDraftValid = hostsSelectors.isHostFilterQueryDraftValid();
  const mapStateToProps = (state: State, { type }: OwnProps) => {
    return {
      hostsFilterQueryDraft: getHostsFilterQueryDraft(state, type),
      isHostFilterQueryDraftValid: getIsHostFilterQueryDraftValid(state, type),
    };
  };
  return mapStateToProps;
};

export const HostsFilter = connect(
  makeMapStateToProps,
  {
    applyHostsFilterQuery: hostsActions.applyHostsFilterQuery,
    setHostsFilterQueryDraft: hostsActions.setHostsFilterQueryDraft,
  }
)(HostsFilterComponent);
