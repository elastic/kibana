/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectableOption } from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Filter } from '@kbn/es-query';
import styled from 'styled-components';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityPublicPluginsStart } from '../../..';
import { SortBySelect } from './common/sort_by_select';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../common/slo/constants';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { SearchState } from '../hooks/use_url_search_state';

export interface Props {
  query?: string;
  filters?: Filter[];
  loading: boolean;
  initialState: SearchState;
  onStateChange: (newState: Partial<SearchState>) => void;
}

export type SortField = 'sli_value' | 'error_budget_consumed' | 'error_budget_remaining' | 'status';
export type SortDirection = 'asc' | 'desc';

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

export type ViewMode = 'default' | 'compact';

export function SloListSearchBar({ query, filters, loading, initialState, onStateChange }: Props) {
  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<ObservabilityPublicPluginsStart>().services;

  return (
    <Container>
      <SearchBar
        appName="observability"
        placeholder={i18n.translate('xpack.observability.slo.list.search', {
          defaultMessage: 'Search your SLOs...',
        })}
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={loading}
        renderQueryInputAppend={() => (
          <SortBySelect
            initialState={initialState}
            loading={loading}
            onStateChange={onStateChange}
          />
        )}
        filters={filters}
        onFiltersUpdated={(newFilters) => {
          onStateChange({ filters: newFilters });
        }}
        onQuerySubmit={({ query: value }) => {
          onStateChange({ kqlQuery: String(value?.query), lastRefresh: Date.now() });
        }}
        query={{ query: String(query), language: 'kuery' }}
        showSubmitButton={true}
        showDatePicker={false}
        onQueryChange={(value) => onStateChange({ kqlQuery: String(value?.query) })}
        submitOnBlur={true}
        showQueryInput={true}
      />
    </Container>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;
