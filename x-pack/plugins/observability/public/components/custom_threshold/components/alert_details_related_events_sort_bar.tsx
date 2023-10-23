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
import React, { useState } from 'react';

export type SortField = 'time' | 'p_value';

interface RelatedEventsSortBarProps {
  loading: boolean;
  onChangeSort: (sort: SortField | undefined) => void;
}

type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

const SORT_OPTIONS: Array<Item<SortField>> = [
  {
    label: i18n.translate('xpack.observability.related.events.sortBy.time', {
      defaultMessage: 'Time',
    }),
    type: 'time',
  },
  {
    label: i18n.translate('xpack.observability.related.events.sortBy.pValue', {
      defaultMessage: 'p-value',
    }),
    type: 'p_value',
  },
];

export function RelatedEventsSortBar({ loading, onChangeSort }: RelatedEventsSortBarProps) {
  const [isSortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [sortOptions, setSortOptions] = useState(SORT_OPTIONS);

  const selectedSort = sortOptions.find((option) => option.checked === 'on');
  const handleToggleSortButton = () => setSortPopoverOpen(!isSortPopoverOpen);

  const handleChangeSort = (newOptions: Array<Item<SortField>>) => {
    setSortOptions(newOptions);
    setSortPopoverOpen(false);
    onChangeSort(newOptions.find((o) => o.checked)?.type);
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
            {i18n.translate('xpack.observability.related.events.sortByType', {
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
        <div style={{ width: 150 }}>
          <EuiPopoverTitle paddingSize="s">
            {i18n.translate('xpack.observability.related.events.sortBy', {
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
  );
}
