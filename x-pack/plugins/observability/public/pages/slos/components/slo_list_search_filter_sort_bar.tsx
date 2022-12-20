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
  onChangeSort: (sortMethod: SortType) => void;
  onChangeStatusFilter: (statusFilters: SortItem[]) => void;
}

export type SortType = 'difference' | 'budgetRemaining';
export type StatusType = 'violated' | 'forecastedViolation' | 'healthy';

export type SortItem = EuiSelectableOption & {
  label: string;
  type: SortType | StatusType;
  checked?: EuiSelectableOptionCheckedType;
};

const SORT_OPTIONS: SortItem[] = [
  {
    label: i18n.translate('xpack.observability.slos.list.sortBy.difference', {
      defaultMessage: 'Difference',
    }),
    type: 'difference',
    checked: 'on',
  },
  {
    label: i18n.translate('xpack.observability.slos.list.sortBy.budgetRemaining', {
      defaultMessage: 'Budget remaining',
    }),
    type: 'budgetRemaining',
  },
];

const STATUS_OPTIONS: SortItem[] = [
  {
    label: i18n.translate('xpack.observability.slos.list.statusFilter.violated', {
      defaultMessage: 'Violated',
    }),
    type: 'violated',
  },
  {
    label: i18n.translate('xpack.observability.slos.list.statusFilter.healthy', {
      defaultMessage: 'Healthy',
    }),
    type: 'healthy',
  },
];

export function SloListSearchFilterSortBar({
  loading,
  onChangeQuery,
  onChangeSort,
  onChangeStatusFilter,
}: SloListSearchFilterSortBarProps) {
  const [isFilterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [isSortPopoverOpen, setSortPopoverOpen] = useState(false);

  const [sortOptions, setSortOptions] = useState(SORT_OPTIONS);
  const [statusOptions, setStatusOptions] = useState(STATUS_OPTIONS);

  const selectedSort = sortOptions.find((option) => option.checked === 'on');
  const selectedStatusFilters = statusOptions.filter((option) => option.checked === 'on');

  const handleToggleFilterButton = () => setFilterPopoverOpen(!isFilterPopoverOpen);
  const handleToggleSortButton = () => setSortPopoverOpen(!isSortPopoverOpen);

  const handleChangeSort = (newOptions: SortItem[]) => {
    setSortOptions(newOptions);
    setSortPopoverOpen(false);
  };

  const handleChangeStatusOptions = (newOptions: SortItem[]) => {
    setStatusOptions(newOptions);
    setFilterPopoverOpen(false);

    onChangeStatusFilter(newOptions.filter((option) => option.checked === 'on'));
  };

  useEffect(() => {
    if (selectedSort?.type === 'difference' || selectedSort?.type === 'budgetRemaining') {
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

      <EuiFlexItem grow={false} style={{ width: 115 }}>
        <EuiFilterGroup>
          <EuiPopover
            button={
              <EuiFilterButton
                iconType="arrowDown"
                onClick={handleToggleFilterButton}
                isSelected={isFilterPopoverOpen}
                numFilters={selectedStatusFilters.length}
              >
                {i18n.translate('xpack.observability.slos.list.statusFilter', {
                  defaultMessage: 'Status',
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
                {i18n.translate('xpack.observability.slos.list.statusFilter', {
                  defaultMessage: 'Status',
                })}
              </EuiPopoverTitle>
              <EuiSelectable<SortItem> options={statusOptions} onChange={handleChangeStatusOptions}>
                {(list) => list}
              </EuiSelectable>
            </div>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false} style={{ width: 215 }}>
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
                  values: { type: selectedSort?.label || '' },
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
              <EuiSelectable<SortItem>
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
