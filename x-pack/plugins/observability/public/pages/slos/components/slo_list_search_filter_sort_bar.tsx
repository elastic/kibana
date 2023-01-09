/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
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
import React, { useEffect, useState } from 'react';

export interface SloListSearchFilterSortBarProps {
  loading: boolean;
  onChangeQuery: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeSort: (sort: SortType) => void;
  onChangeIndicatorTypeFilter: (filter: FilterType[]) => void;
}

export type SortType = 'name' | 'indicator_type';
export type FilterType =
  | 'sli.apm.transaction_duration'
  | 'sli.apm.transaction_error_rate'
  | 'sli.kql.custom';

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

const SORT_OPTIONS: Array<Item<SortType>> = [
  {
    label: i18n.translate('xpack.observability.slos.list.sortBy.name', {
      defaultMessage: 'Name',
    }),
    type: 'name',
    checked: 'on',
  },
  {
    label: i18n.translate('xpack.observability.slos.list.sortBy.indicatorType', {
      defaultMessage: 'Indicator type',
    }),
    type: 'indicator_type',
  },
];

const INDICATOR_TYPE_OPTIONS: Array<Item<FilterType>> = [
  {
    label: i18n.translate('xpack.observability.slos.list.indicatorTypeFilter.apmLatency', {
      defaultMessage: 'APM latency',
    }),
    type: 'sli.apm.transaction_duration',
  },
  {
    label: i18n.translate('xpack.observability.slos.list.indicatorTypeFilter.apmAvailability', {
      defaultMessage: 'APM availability',
    }),
    type: 'sli.apm.transaction_error_rate',
  },
  {
    label: i18n.translate('xpack.observability.slos.list.indicatorTypeFilter.customKql', {
      defaultMessage: 'Custom KQL',
    }),
    type: 'sli.kql.custom',
  },
];

export function SloListSearchFilterSortBar({
  loading,
  onChangeQuery,
  onChangeSort,
  onChangeIndicatorTypeFilter,
}: SloListSearchFilterSortBarProps) {
  const [isFilterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [isSortPopoverOpen, setSortPopoverOpen] = useState(false);

  const [sortOptions, setSortOptions] = useState(SORT_OPTIONS);
  const [indicatorTypeOptions, setIndicatorTypeOptions] = useState(INDICATOR_TYPE_OPTIONS);

  const selectedSort = sortOptions.find((option) => option.checked === 'on');
  const selectedIndicatorTypeFilter = indicatorTypeOptions.filter(
    (option) => option.checked === 'on'
  );

  const handleToggleFilterButton = () => setFilterPopoverOpen(!isFilterPopoverOpen);
  const handleToggleSortButton = () => setSortPopoverOpen(!isSortPopoverOpen);

  const handleChangeSort = (newOptions: Array<Item<SortType>>) => {
    setSortOptions(newOptions);
    setSortPopoverOpen(false);
  };

  const handleChangeIndicatorTypeOptions = (newOptions: Array<Item<FilterType>>) => {
    setIndicatorTypeOptions(newOptions);
    onChangeIndicatorTypeFilter(
      newOptions.filter((option) => option.checked === 'on').map((option) => option.type)
    );
  };

  useEffect(() => {
    if (selectedSort?.type === 'name' || selectedSort?.type === 'indicator_type') {
      onChangeSort(selectedSort.type);
    }
  }, [onChangeSort, selectedSort]);

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow>
        <EuiFieldSearch
          fullWidth
          isLoading={loading}
          onChange={onChangeQuery}
          placeholder={i18n.translate('xpack.observability.slos.list.search', {
            defaultMessage: 'Search',
          })}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ width: 200 }}>
        <EuiFilterGroup>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                onClick={handleToggleFilterButton}
                isSelected={isFilterPopoverOpen}
                numFilters={selectedIndicatorTypeFilter.length}
              >
                {i18n.translate('xpack.observability.slos.list.indicatorTypeFilter', {
                  defaultMessage: 'Indicator type',
                })}
              </EuiFilterButton>
            }
            isOpen={isFilterPopoverOpen}
            closePopover={handleToggleFilterButton}
            panelPaddingSize="none"
            anchorPosition="downCenter"
          >
            <div style={{ width: 300 }}>
              <EuiPopoverTitle paddingSize="s">
                {i18n.translate('xpack.observability.slos.list.indicatorTypeFilter', {
                  defaultMessage: 'Indicator type',
                })}
              </EuiPopoverTitle>
              <EuiSelectable<Item<FilterType>>
                options={indicatorTypeOptions}
                onChange={handleChangeIndicatorTypeOptions}
              >
                {(list) => list}
              </EuiSelectable>
            </div>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ width: 200 }}>
        <EuiFilterGroup>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                onClick={handleToggleSortButton}
                isSelected={isSortPopoverOpen}
              >
                {i18n.translate('xpack.observability.slos.list.sortByType', {
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
                {i18n.translate('xpack.observability.slos.list.sortBy', {
                  defaultMessage: 'Sort by',
                })}
              </EuiPopoverTitle>
              <EuiSelectable<Item<SortType>>
                singleSelection
                options={sortOptions}
                onChange={handleChangeSort}
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
