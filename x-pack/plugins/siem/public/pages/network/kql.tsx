/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { pure } from 'recompose';
import { StaticIndexPattern } from 'ui/index_patterns';

import { AutocompleteField } from '../../components/autocomplete_field';
import { KueryAutocompletion } from '../../containers/kuery_autocompletion';
import { NetworkFilter } from '../../containers/network';
import { networkModel } from '../../store';

import * as i18n from './translations';

interface NetworkKqlProps {
  indexPattern: StaticIndexPattern;
  type: networkModel.NetworkType;
}

export const NetworkKql = pure<NetworkKqlProps>(({ indexPattern, type }) => (
  <KueryAutocompletion indexPattern={indexPattern}>
    {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
      <NetworkFilter indexPattern={indexPattern} type={type}>
        {({
          applyFilterQueryFromKueryExpression,
          filterQueryDraft,
          isFilterQueryDraftValid,
          setFilterQueryDraftFromKueryExpression,
        }) => (
          <AutocompleteField
            isLoadingSuggestions={isLoadingSuggestions}
            isValid={isFilterQueryDraftValid}
            loadSuggestions={loadSuggestions}
            onChange={setFilterQueryDraftFromKueryExpression}
            onSubmit={applyFilterQueryFromKueryExpression}
            placeholder={i18n.KQL_PLACEHOLDER}
            suggestions={suggestions}
            value={filterQueryDraft ? filterQueryDraft.expression : ''}
          />
        )}
      </NetworkFilter>
    )}
  </KueryAutocompletion>
));
