/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import React, { useState } from 'react';
import { Filter } from '@kbn/es-query';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../../../common/slo/constants';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { SearchState } from '../hooks/use_url_search_state';

export interface Props {
  loading: boolean;
  initialState: SearchState;
  onChangeQuery: (query: string) => void;
  onChangeSort: (sort: SortField) => void;
  onFiltersChange: (filters: Filter[]) => void;
}

export type SortField = 'sli_value' | 'error_budget_consumed' | 'error_budget_remaining' | 'status';
export type SortDirection = 'asc' | 'desc';

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

const SORT_OPTIONS: Array<Item<SortField>> = [
  {
    label: i18n.translate('xpack.observability.slo.list.sortBy.sliValue', {
      defaultMessage: 'SLI value',
    }),
    type: 'sli_value',
  },
  {
    label: i18n.translate('xpack.observability.slo.list.sortBy.sloStatus', {
      defaultMessage: 'SLO status',
    }),
    type: 'status',
  },
  {
    label: i18n.translate('xpack.observability.slo.list.sortBy.errorBudgetConsumed', {
      defaultMessage: 'Error budget consumed',
    }),
    type: 'error_budget_consumed',
  },
  {
    label: i18n.translate('xpack.observability.slo.list.sortBy.errorBudgetRemaining', {
      defaultMessage: 'Error budget remaining',
    }),
    type: 'error_budget_remaining',
  },
];

export type ViewMode = 'default' | 'compact';

export function SloListSearchBar({
  loading,
  onChangeQuery,
  onChangeSort,
  initialState,
  onFiltersChange,
}: Props) {
  const { dataView } = useCreateDataView({
    indexPatternString: SLO_SUMMARY_DESTINATION_INDEX_NAME,
  });

  const [query, setQuery] = useState(initialState.kqlQuery);
  const [filters, setFilters] = useState<Filter[]>(initialState.filters ?? []);
  const [isSortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState<Array<Item<SortField>>>(
    SORT_OPTIONS.map((option) => ({
      ...option,
      checked: option.type === initialState.sort.by ? 'on' : undefined,
    }))
  );
  const selectedSort = sortOptions.find((option) => option.checked === 'on');

  const handleToggleSortButton = () => setSortPopoverOpen(!isSortPopoverOpen);
  const handleChangeSort = (newOptions: Array<Item<SortField>>) => {
    setSortOptions(newOptions);
    setSortPopoverOpen(false);
    onChangeSort(newOptions.find((o) => o.checked)!.type);
  };

  return (
    <SearchBar
      placeholder={i18n.translate('xpack.observability.slo.list.search', {
        defaultMessage: 'Search your SLOs...',
      })}
      indexPatterns={dataView ? [dataView] : []}
      isDisabled={loading}
      renderQueryInputAppend={() => (
        <EuiFilterGroup>
          <EuiPopover
            button={
              <EuiFilterButton
                disabled={loading}
                iconType="arrowDown"
                onClick={handleToggleSortButton}
                isSelected={isSortPopoverOpen}
              >
                {i18n.translate('xpack.observability.slo.list.sortByType', {
                  defaultMessage: 'Sort by {type}',
                  values: { type: selectedSort?.label.toLowerCase() ?? '' },
                })}
              </EuiFilterButton>
            }
            isOpen={isSortPopoverOpen}
            closePopover={handleToggleSortButton}
            panelPaddingSize="none"
            anchorPosition="downCenter"
          >
            <div style={{ width: 250 }}>
              <EuiPopoverTitle paddingSize="s">
                {i18n.translate('xpack.observability.slo.list.sortBy', {
                  defaultMessage: 'Sort by',
                })}
              </EuiPopoverTitle>
              <EuiSelectable<Item<SortField>>
                singleSelection="always"
                options={sortOptions}
                onChange={handleChangeSort}
                isLoading={loading}
              >
                {(list) => list}
              </EuiSelectable>
            </div>
          </EuiPopover>
        </EuiFilterGroup>
      )}
      filters={filters}
      onFiltersUpdated={(newFilters) => {
        setFilters(newFilters);
        onFiltersChange(newFilters);
      }}
      onQuerySubmit={({ query: value }) => {
        setQuery(String(value?.query));
        onChangeQuery(String(value?.query));
      }}
      query={{ query: String(query), language: 'kuery' }}
      showSubmitButton={false}
      showAutoRefreshOnly={true}
      onRefreshChange={() => {}}
      onQueryChange={(value) => setQuery(String(value.query?.query))}
      submitOnBlur={true}
    />
  );
}
