/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelectableOption } from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Query } from '@kbn/es-query';
import { useSloCrudLoading } from '../hooks/use_crud_loading';
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
  const {
    data: { query },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<ObservabilityPublicPluginsStart>().services;

  const { state, store: storeState } = useUrlSearchState();

  const loading = useSloCrudLoading();

  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  const onStateChange = useCallback(
    (newState: Partial<SearchState>) => {
      storeState({ page: 0, ...newState });
    },
    [storeState]
  );

  useEffect(() => {
    query.state$.subscribe(() => {
      const queryState = query.getState();
      onStateChange({
        kqlQuery: String((queryState.query as Query).query),
        filters: queryState.filters,
      });
    });
  }, [onStateChange, query]);

  return (
    <Container>
      <SearchBar
        appName="observability"
        placeholder={PLACEHOLDER}
        indexPatterns={dataView ? [dataView] : []}
        isDisabled={loading}
        renderQueryInputAppend={() => (
          <QuickFilters initialState={state} loading={loading} onStateChange={onStateChange} />
        )}
        showDatePicker={false}
        showQueryMenu={true}
        showQueryInput={true}
        disableQueryLanguageSwitcher={true}
        saveQueryMenuVisibility="globally_managed"
        useDefaultBehaviors={true}
      />
    </Container>
  );
}

const Container = styled.div`
  .uniSearchBar {
    padding: 0;
  }
`;

const PLACEHOLDER = i18n.translate('xpack.observability.slo.list.search', {
  defaultMessage: 'Search your SLOs ...',
});
