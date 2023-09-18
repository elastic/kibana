/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import React, { useState } from 'react';
import { useCreateDataView } from '../../../hooks/use_create_data_view';
import { useKibana } from '../../../utils/kibana_react';

export interface SloListSearchFilterSortBarProps {
  loading: boolean;
  onChangeQuery: (query: string) => void;
  onChangeSort: (sort: SortField | undefined) => void;
}

export type SortField = 'sli_value' | 'error_budget_consumed' | 'error_budget_remaining' | 'status';

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
    checked: 'on',
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

export function SloListSearchFilterSortBar({
  loading,
  onChangeQuery,
  onChangeSort,
}: SloListSearchFilterSortBarProps) {
  const { data, dataViews, docLinks, http, notifications, storage, uiSettings, unifiedSearch } =
    useKibana().services;
  const { dataView } = useCreateDataView({ indexPatternString: '.slo-observability.summary-*' });

  const [isSortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState(SORT_OPTIONS);
  const [query, setQuery] = useState('');

  const selectedSort = sortOptions.find((option) => option.checked === 'on');
  const handleToggleSortButton = () => setSortPopoverOpen(!isSortPopoverOpen);

  const handleChangeSort = (newOptions: Array<Item<SortField>>) => {
    setSortOptions(newOptions);
    setSortPopoverOpen(false);
    onChangeSort(newOptions.find((o) => o.checked)?.type);
  };

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow>
        <QueryStringInput
          appName="Observability"
          bubbleSubmitEvent={false}
          deps={{
            data,
            dataViews,
            docLinks,
            http,
            notifications,
            storage,
            uiSettings,
            unifiedSearch,
          }}
          disableAutoFocus
          onSubmit={() => onChangeQuery(query)}
          disableLanguageSwitcher
          isDisabled={loading}
          indexPatterns={dataView ? [dataView] : []}
          placeholder={i18n.translate('xpack.observability.slo.list.search', {
            defaultMessage: 'Search your SLOs...',
          })}
          query={{ query: String(query), language: 'kuery' }}
          size="s"
          onChange={(value) => setQuery(String(value.query))}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={true} style={{ maxWidth: 280 }}>
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
                  values: { type: selectedSort?.label.toLowerCase() || '' },
                })}
              </EuiFilterButton>
            }
            isOpen={isSortPopoverOpen}
            closePopover={handleToggleSortButton}
            panelPaddingSize="none"
            anchorPosition="downCenter"
          >
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">
                {i18n.translate('xpack.observability.slo.list.sortBy', {
                  defaultMessage: 'Sort by',
                })}
              </EuiPopoverTitle>
              <EuiSelectable<Item<SortField>>
                singleSelection
                options={sortOptions}
                onChange={handleChangeSort}
                isLoading={loading}
              >
                {(list) => list}
              </EuiSelectable>
            </div>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
