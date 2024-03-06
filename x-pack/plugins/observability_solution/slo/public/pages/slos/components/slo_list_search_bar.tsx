/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectableOption } from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Query } from '@kbn/es-query';
import { observabilityAppId } from '@kbn/observability-plugin/public';
import { useKibana } from '../../../utils/kibana_react';
import { useSloCrudLoading } from '../hooks/use_crud_loading';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../common/constants';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { QuickFilters } from './common/quick_filters';

export type SortField = 'sli_value' | 'error_budget_consumed' | 'error_budget_remaining' | 'status';
export type SortDirection = 'asc' | 'desc';

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

export type ViewMode = 'default' | 'compact';

export function SloListSearchBar() {
  const {
    data: { query },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const { state, onStateChange } = useUrlSearchState();
  const loading = useSloCrudLoading();

  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  useEffect(() => {
    const sub = query.state$.subscribe(() => {
      const queryState = query.getState();
      onStateChange({
        kqlQuery: String((queryState.query as Query).query),
        filters: queryState.filters,
      });
    });

    return () => sub.unsubscribe();
  }, [onStateChange, query]);

  return (
    <Container>
      <SearchBar
        appName={observabilityAppId}
        placeholder={PLACEHOLDER}
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={loading}
        renderQueryInputAppend={() => (
          <QuickFilters initialState={state} loading={loading} onStateChange={onStateChange} />
        )}
        filters={state.filters}
        onFiltersUpdated={(newFilters) => {
          onStateChange({ filters: newFilters });
        }}
        onQuerySubmit={({ query: value }) => {
          onStateChange({ kqlQuery: String(value?.query), lastRefresh: Date.now() });
        }}
        query={{ query: String(state.kqlQuery), language: 'kuery' }}
        showSubmitButton={true}
        showDatePicker={false}
        showQueryInput={true}
        disableQueryLanguageSwitcher={true}
        saveQueryMenuVisibility="globally_managed"
        onClearSavedQuery={() => {}}
        onSavedQueryUpdated={(savedQuery) => {
          onStateChange({
            filters: savedQuery.attributes.filters,
            kqlQuery: String(savedQuery.attributes.query.query),
          });
        }}
      />
    </Container>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;

const PLACEHOLDER = i18n.translate('xpack.slo.list.search', {
  defaultMessage: 'Search your SLOs ...',
});
