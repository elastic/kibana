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
import { ConfigKey } from '../../../../../../../common/runtime_types';

import { selectOverviewState, setOverviewPageStateAction } from '../../../../state/overview';

export const SortFields = () => {
  const {
    pageState: { sortOrder, sortField },
  } = useSelector(selectOverviewState);
  const dispatch = useDispatch();
  const [isSortByOpen, setIsSortByOpen] = useState(false);
  const { asc, desc, label } = getOrderContent(sortField);
  const orderByOptions = [
    {
      label: ORDER_BY_TITLE,
      isGroupLabel: true,
    },
    {
      label: asc,
      value: 'asc',
      checked: sortOrder === 'asc' ? 'on' : (undefined as EuiSelectableOptionCheckedType),
    },
    {
      label: desc,
      value: 'desc',
      checked: sortOrder === 'desc' ? 'on' : (undefined as EuiSelectableOptionCheckedType),
    },
  ];
  const sortByOptions = [
    {
      label: SORT_BY_TITLE,
      isGroupLabel: true,
    },
    {
      label: ALPHABETICAL_LABEL,
      value: `${ConfigKey.NAME}.keyword`,
      checked:
        sortField === `${ConfigKey.NAME}.keyword`
          ? 'on'
          : (undefined as EuiSelectableOptionCheckedType),
      defaultSortOrder: 'asc',
    },
    {
      label: LAST_MODIFIED_LABEL,
      value: 'updated_at',
      checked: sortField === 'updated_at' ? 'on' : (undefined as EuiSelectableOptionCheckedType),
      defaultSortOrder: 'desc',
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h6>{SORT_BY_TITLE}</h6>
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
                  {label}
                </EuiButtonEmpty>
              }
              isOpen={isSortByOpen}
              closePopover={() => setIsSortByOpen(false)}
            >
              <EuiSelectable
                options={sortByOptions}
                style={{ width: '228px' }}
                singleSelection={'always'}
                onChange={(options) => {
                  const checkedOption = options.find((option) => option.checked === 'on');
                  dispatch(
                    setOverviewPageStateAction({
                      sortField: checkedOption?.value || sortField,
                      sortOrder: (checkedOption?.defaultSortOrder as 'asc' | 'desc') || sortOrder,
                    })
                  );
                }}
              >
                {(list) => list}
              </EuiSelectable>
              <EuiSelectable
                options={orderByOptions}
                style={{ width: '228px' }}
                singleSelection={'always'}
                onChange={(options) => {
                  dispatch(
                    setOverviewPageStateAction({
                      sortOrder:
                        (options.find((option) => option.checked === 'on')?.value as
                          | 'asc'
                          | 'desc') || sortOrder,
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

const getOrderContent = (sortField: string) => {
  switch (sortField) {
    case `${ConfigKey.NAME}.keyword`:
      return {
        asc: SORT_ALPHABETICAL_ASC,
        desc: SORT_ALPHABETICAL_DESC,
        label: ALPHABETICAL_LABEL,
      };
    case 'updated_at':
      return {
        asc: SORT_UPDATED_ASC,
        desc: SORT_UPDATED_DESC,
        label: LAST_MODIFIED_LABEL,
      };
    default:
      return {
        asc: ASCENDING_LABEL,
        desc: DESCENDING_LABEL,
        label: '',
      };
  }
};

const SORT_BY_TITLE = i18n.translate('xpack.synthetics.overview.sortPopover.sortBy.title', {
  defaultMessage: 'Sort by',
});

const ORDER_BY_TITLE = i18n.translate('xpack.synthetics.overview.sortPopover.orderBy.title', {
  defaultMessage: 'Order',
});

const SORT_ALPHABETICAL_ASC = i18n.translate(
  'xpack.synthetics.overview.sortPopover.alphabetical.asc',
  {
    defaultMessage: 'A -> Z',
    description: 'Describes ascending alphabetical sort order',
  }
);

const SORT_ALPHABETICAL_DESC = i18n.translate(
  'xpack.synthetics.overview.sortPopover.alphabetical.desc',
  {
    defaultMessage: 'Z -> A',
    description: 'Describes descending alphabetical sort order',
  }
);

const SORT_UPDATED_ASC = i18n.translate('xpack.synthetics.overview.sortPopover.lastModified.desc', {
  defaultMessage: 'Oldest first',
});

const SORT_UPDATED_DESC = i18n.translate(
  'xpack.synthetics.overview.sortPopover.lastModified.desc',
  {
    defaultMessage: 'Newest first',
  }
);

const ASCENDING_LABEL = i18n.translate('xpack.synthetics.overview.sortPopover.ascending.label', {
  defaultMessage: 'Ascending',
});

const DESCENDING_LABEL = i18n.translate('xpack.synthetics.overview.sortPopover.descending.label', {
  defaultMessage: 'Descending',
});

const ALPHABETICAL_LABEL = i18n.translate(
  'xpack.synthetics.overview.sortPopover.alphabetical.label',
  {
    defaultMessage: 'Alphabetical',
  }
);

const LAST_MODIFIED_LABEL = i18n.translate(
  'xpack.synthetics.overview.sortPopover.lastModified.label',
  {
    defaultMessage: 'Last modified',
  }
);
