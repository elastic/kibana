/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { Source } from '../../../../containers/metrics_source';
import { AutocompleteField } from '../../../../components/autocomplete_field';
import { WithKueryAutocompletion } from '../../../../containers/with_kuery_autocompletion';
import { useWaffleFiltersContext } from '../hooks/use_waffle_filters';

export const SearchBar = () => {
  const { createDerivedIndexPattern } = useContext(Source.Context);
  const {
    applyFilterQueryFromKueryExpression,
    filterQueryDraft,
    isFilterQueryDraftValid,
    setFilterQueryDraftFromKueryExpression,
  } = useWaffleFiltersContext();
  return (
    <WithKueryAutocompletion indexPattern={createDerivedIndexPattern()}>
      {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
        <AutocompleteField
          isLoadingSuggestions={isLoadingSuggestions}
          isValid={isFilterQueryDraftValid}
          loadSuggestions={loadSuggestions}
          onChange={setFilterQueryDraftFromKueryExpression}
          onSubmit={applyFilterQueryFromKueryExpression}
          placeholder={i18n.translate('xpack.infra.homePage.toolbar.kqlSearchFieldPlaceholder', {
            defaultMessage: 'Search for infrastructure data… (e.g. host.name:host-1)',
          })}
          suggestions={suggestions}
          value={filterQueryDraft ? filterQueryDraft : ''}
          autoFocus={true}
        />
      )}
    </WithKueryAutocompletion>
  );
};
