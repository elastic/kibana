/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { pure } from 'recompose';
import { StaticIndexPattern } from 'ui/index_patterns';
import { convertKueryToElasticSearchQuery } from '../../lib/keury';
import { hostsActions, hostsSelectors, State } from '../../store';
import { KueryFilterQuery, SerializedFilterQuery } from '../../store/local/hosts/model';

export interface HostsFilterArgs {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  isFilterQueryDraftValid: boolean;
  setFilterQueryDraftFromKueryExpression: (expression: string) => void;
}

interface OwnProps {
  children: (args: HostsFilterArgs) => React.ReactNode;
  indexPattern: StaticIndexPattern;
}

interface HostsFilterReduxProps {
  hostsFilterQueryDraft: KueryFilterQuery;
  isHostFilterQueryDraftValid: boolean;
}

interface HostsFilterDispatchProps {
  applyHostsFilterQuery: (filterQuery: SerializedFilterQuery) => void;
  setHostsFilterQueryDraft: (filterQueryDraft: KueryFilterQuery) => void;
}

type HostsFilterProps = OwnProps & HostsFilterReduxProps & HostsFilterDispatchProps;

const HostsFilterComponent = pure<HostsFilterProps>(
  ({
    applyHostsFilterQuery,
    children,
    hostsFilterQueryDraft,
    indexPattern,
    isHostFilterQueryDraftValid,
    setHostsFilterQueryDraft,
  }) => (
    <>
      {children({
        applyFilterQueryFromKueryExpression: (expression: string) =>
          applyHostsFilterQuery({
            query: {
              kind: 'kuery',
              expression,
            },
            serializedQuery: convertKueryToElasticSearchQuery(expression, indexPattern),
          }),
        filterQueryDraft: hostsFilterQueryDraft,
        isFilterQueryDraftValid: isHostFilterQueryDraftValid,
        setFilterQueryDraftFromKueryExpression: (expression: string) =>
          setHostsFilterQueryDraft({
            kind: 'kuery',
            expression,
          }),
      })}
    </>
  )
);

export const HostsFilter = connect(
  (state: State) => ({
    hostsFilterQueryDraft: hostsSelectors.hostsFilterQueryDraft(state),
    isHostFilterQueryDraftValid: hostsSelectors.isHostFilterQueryDraftValid(state),
  }),
  {
    applyHostsFilterQuery: hostsActions.applyHostsFilterQuery,
    setHostsFilterQueryDraft: hostsActions.setHostsFilterQueryDraft,
  }
)(HostsFilterComponent);
