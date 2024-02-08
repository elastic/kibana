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
import styled from 'styled-components';
import { useIsMutating } from '@tanstack/react-query';
import { QuickFilters } from './common/quick_filters';
import { useKibana } from '../../../utils/kibana_react';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../common/slo/constants';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { ObservabilityPublicPluginsStart } from '../../..';
import { SearchState, useUrlSearchState } from '../hooks/use_url_search_state';

export type SortField = 'sli_value' | 'error_budget_consumed' | 'error_budget_remaining' | 'status';
export type SortDirection = 'asc' | 'desc';

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

export type ViewMode = 'default' | 'compact';

export function SloListSearchBar() {
  const { state, onStateChange: onChange } = useUrlSearchState();
  const { kqlQuery, filters } = state;

  const containerRef = React.useRef<HTMLDivElement>(null);

  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isCloningSlo = Boolean(useIsMutating(['cloningSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  const loading = isCreatingSlo || isCloningSlo || isUpdatingSlo || isDeletingSlo;

  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  const onStateChange = (newState: Partial<SearchState>) => {
    onChange({ page: 0, ...newState });
  };

  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<ObservabilityPublicPluginsStart>().services;

  return (
    <Container ref={containerRef}>
      <SearchBar
        appName="observability"
        placeholder={i18n.translate('xpack.observability.slo.list.search', {
          defaultMessage: 'Search your SLOs...',
        })}
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={loading}
        renderQueryInputAppend={() => (
          <QuickFilters initialState={state} loading={loading} onStateChange={onStateChange} />
        )}
        filters={filters}
        onFiltersUpdated={(newFilters) => {
          onStateChange({ filters: newFilters });
        }}
        onQuerySubmit={({ query: value }) => {
          onStateChange({ kqlQuery: String(value?.query), lastRefresh: Date.now() });
        }}
        query={{ query: String(kqlQuery), language: 'kuery' }}
        showSubmitButton={true}
        showDatePicker={false}
        showQueryInput={true}
        disableQueryLanguageSwitcher={true}
        saveQueryMenuVisibility="globally_managed"
      />
    </Container>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;
