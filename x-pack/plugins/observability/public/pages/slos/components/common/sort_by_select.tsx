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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { SearchState } from '../../hooks/use_url_search_state';
import { Item, SortField } from '../slo_list_search_bar';

interface Props {
  initialState: SearchState;
  loading: boolean;
  onStateChange: (newState: Partial<SearchState>) => void;
}

export function SortBySelect({ initialState, onStateChange, loading }: Props) {
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
    onStateChange({
      page: 0,
      sort: { by: newOptions.find((o) => o.checked)!.type, direction: initialState.sort.direction },
    });
  };

  return (
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
  );
}

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
