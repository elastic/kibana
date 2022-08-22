/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButtonEmpty,
  EuiSelectable,
} from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';

import { selectOverviewState, setOverviewPageStateAction } from '../../../../../state/overview';

export const SortFields = () => {
  const {
    pageState: { sortOrder },
  } = useSelector(selectOverviewState);
  const dispatch = useDispatch();
  const [isSortByOpen, setIsSortByOpen] = useState(false);
  const orderByOptions = [
    {
      label: 'Order by',
      isGroupLabel: true,
    },
    {
      label: 'Ascending',
      value: 'asc',
      checked: sortOrder === 'asc' ? 'on' : (undefined as EuiSelectableOptionCheckedType),
    },
    {
      label: 'Descending',
      value: 'desc',
      checked: sortOrder === 'desc' ? 'on' : (undefined as EuiSelectableOptionCheckedType),
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h6>Sort by</h6>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButtonEmpty
                  size="xs"
                  iconSide="right"
                  iconType="arrowDown"
                  onClick={() => setIsSortByOpen((isOpen: boolean) => !isOpen)}
                >
                  Status
                </EuiButtonEmpty>
              }
              isOpen={isSortByOpen}
              closePopover={() => setIsSortByOpen(false)}
            >
              <EuiSelectable
                options={orderByOptions}
                style={{ width: '300px' }}
                singleSelection={'always'}
                onChange={(options) => {
                  dispatch(
                    setOverviewPageStateAction({
                      sortOrder:
                        (options.find((option) => option.checked === 'on')?.value as
                          | 'asc'
                          | 'desc') || 'asc',
                    })
                  );
                }}
              >
                {(list) => list}
              </EuiSelectable>
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
