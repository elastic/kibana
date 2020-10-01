/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
import React, { memo, ReactNode, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiTableActionsColumnType,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { Immutable } from '../../../../../common/endpoint/types';
import { AppAction } from '../../../../common/store/actions';
import { TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { MANAGEMENT_PAGE_SIZE_OPTIONS } from '../../../common/constants';
import { getTrustedAppsListPath } from '../../../common/routing';

import {
  getListCurrentPageIndex,
  getListCurrentPageSize,
  getListErrorMessage,
  getListItems,
  getListTotalItemsCount,
  isListLoading,
} from '../store/selectors';

import { useTrustedAppsSelector } from './hooks';

import { FormattedDate } from '../../../../common/components/formatted_date';
import { ACTIONS_COLUMN_TITLE, LIST_ACTIONS, OS_TITLES, PROPERTY_TITLES } from './translations';
import { TrustedAppCard } from './components/trusted_app_card';

interface DetailsMap {
  [K: string]: ReactNode;
}

interface TrustedAppsListContext {
  dispatch: Dispatch<Immutable<AppAction>>;
  detailsMapState: [DetailsMap, (value: DetailsMap) => void];
}

type ColumnsList = Array<EuiBasicTableColumn<Immutable<TrustedApp>>>;
type ActionsList = EuiTableActionsColumnType<Immutable<TrustedApp>>['actions'];

const toggleItemDetailsInMap = (
  map: DetailsMap,
  item: Immutable<TrustedApp>,
  { dispatch }: TrustedAppsListContext
): DetailsMap => {
  const changedMap = { ...map };

  if (changedMap[item.id]) {
    delete changedMap[item.id];
  } else {
    changedMap[item.id] = (
      <TrustedAppCard
        trustedApp={item}
        onDelete={() => {
          dispatch({
            type: 'trustedAppDeletionDialogStarted',
            payload: { entry: item },
          });
        }}
      />
    );
  }

  return changedMap;
};

const getActionDefinitions = ({ dispatch }: TrustedAppsListContext): ActionsList => [
  {
    name: LIST_ACTIONS.delete.name,
    description: LIST_ACTIONS.delete.description,
    'data-test-subj': 'trustedAppDeleteAction',
    isPrimary: true,
    icon: 'trash',
    color: 'danger',
    type: 'icon',
    onClick: (item: Immutable<TrustedApp>) => {
      dispatch({
        type: 'trustedAppDeletionDialogStarted',
        payload: { entry: item },
      });
    },
  },
];

const getColumnDefinitions = (context: TrustedAppsListContext): ColumnsList => {
  const [itemDetailsMap, setItemDetailsMap] = context.detailsMapState;

  return [
    {
      field: 'name',
      name: PROPERTY_TITLES.name,
    },
    {
      field: 'os',
      name: PROPERTY_TITLES.os,
      render(value: TrustedApp['os'], record: Immutable<TrustedApp>) {
        return OS_TITLES[value];
      },
    },
    {
      field: 'created_at',
      name: PROPERTY_TITLES.created_at,
      render(value: TrustedApp['created_at'], record: Immutable<TrustedApp>) {
        return (
          <FormattedDate
            fieldName={PROPERTY_TITLES.created_at}
            value={value}
            className="eui-textTruncate"
          />
        );
      },
    },
    {
      field: 'created_by',
      name: PROPERTY_TITLES.created_by,
    },
    {
      name: ACTIONS_COLUMN_TITLE,
      actions: getActionDefinitions(context),
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render(item: Immutable<TrustedApp>) {
        return (
          <EuiButtonIcon
            onClick={() => setItemDetailsMap(toggleItemDetailsInMap(itemDetailsMap, item, context))}
            aria-label={itemDetailsMap[item.id] ? 'Collapse' : 'Expand'}
            iconType={itemDetailsMap[item.id] ? 'arrowUp' : 'arrowDown'}
            data-test-subj="trustedAppsListItemExpandButton"
          />
        );
      },
    },
  ];
};

export const TrustedAppsList = memo(() => {
  const [detailsMap, setDetailsMap] = useState<DetailsMap>({});
  const pageIndex = useTrustedAppsSelector(getListCurrentPageIndex);
  const pageSize = useTrustedAppsSelector(getListCurrentPageSize);
  const totalItemCount = useTrustedAppsSelector(getListTotalItemsCount);
  const listItems = useTrustedAppsSelector(getListItems);
  const dispatch = useDispatch();
  const history = useHistory();

  return (
    <EuiBasicTable
      columns={useMemo(
        () => getColumnDefinitions({ dispatch, detailsMapState: [detailsMap, setDetailsMap] }),
        [dispatch, detailsMap, setDetailsMap]
      )}
      items={useMemo(() => [...listItems], [listItems])}
      error={useTrustedAppsSelector(getListErrorMessage)}
      loading={useTrustedAppsSelector(isListLoading)}
      itemId="id"
      itemIdToExpandedRowMap={detailsMap}
      isExpandable={true}
      pagination={useMemo(
        () => ({
          pageIndex,
          pageSize,
          totalItemCount,
          hidePerPageOptions: false,
          pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
        }),
        [pageIndex, pageSize, totalItemCount]
      )}
      onChange={useCallback(
        ({ page }: { page: { index: number; size: number } }) => {
          history.push(
            getTrustedAppsListPath({
              page_index: page.index,
              page_size: page.size,
            })
          );
        },
        [history]
      )}
      data-test-subj="trustedAppsList"
    />
  );
});

TrustedAppsList.displayName = 'TrustedAppsList';
