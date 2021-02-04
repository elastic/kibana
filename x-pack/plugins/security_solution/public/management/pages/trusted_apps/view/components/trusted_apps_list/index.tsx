/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dispatch } from 'redux';
import React, { memo, ReactNode, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiTableActionsColumnType,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

import { useHistory } from 'react-router-dom';
import { Immutable, TrustedApp } from '../../../../../../../common/endpoint/types';
import { AppAction } from '../../../../../../common/store/actions';

import {
  getCurrentLocation,
  getListErrorMessage,
  getListItems,
  getListPagination,
  isListLoading,
} from '../../../store/selectors';

import { FormattedDate } from '../../../../../../common/components/formatted_date';
import { TextFieldValue } from '../../../../../../common/components/text_field_value';

import { useTrustedAppsNavigateCallback, useTrustedAppsSelector } from '../../hooks';

import { ACTIONS_COLUMN_TITLE, LIST_ACTIONS, OS_TITLES, PROPERTY_TITLES } from '../../translations';
import { TrustedAppCard, TrustedAppCardProps } from '../trusted_app_card';
import { getTrustedAppsListPath } from '../../../../../common/routing';

interface DetailsMap {
  [K: string]: ReactNode;
}

interface TrustedAppsListContext {
  dispatch: Dispatch<Immutable<AppAction>>;
  detailsMapState: [DetailsMap, (value: DetailsMap) => void];
}

type ColumnsList = Array<EuiBasicTableColumn<Immutable<TrustedApp>>>;
type ActionsList = EuiTableActionsColumnType<Immutable<TrustedApp>>['actions'];

const ExpandedRowContent = memo<Pick<TrustedAppCardProps, 'trustedApp'>>(({ trustedApp }) => {
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useTrustedAppsSelector(getCurrentLocation);

  const handleOnDelete = useCallback(() => {
    dispatch({
      type: 'trustedAppDeletionDialogStarted',
      payload: { entry: trustedApp },
    });
  }, [dispatch, trustedApp]);

  const handleOnEdit = useCallback(() => {
    history.push(
      getTrustedAppsListPath({
        ...location,
        show: 'edit',
        id: trustedApp.id,
      })
    );
  }, [history, location, trustedApp.id]);

  return <TrustedAppCard trustedApp={trustedApp} onEdit={handleOnEdit} onDelete={handleOnDelete} />;
});
ExpandedRowContent.displayName = 'ExpandedRowContent';

const toggleItemDetailsInMap = (map: DetailsMap, item: Immutable<TrustedApp>): DetailsMap => {
  const changedMap = { ...map };

  if (changedMap[item.id]) {
    delete changedMap[item.id];
  } else {
    changedMap[item.id] = <ExpandedRowContent trustedApp={item} />;
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
      render(value: TrustedApp['name'], record: Immutable<TrustedApp>) {
        return (
          <TextFieldValue
            fieldName={PROPERTY_TITLES.name}
            value={value}
            className="eui-textTruncate"
          />
        );
      },
    },
    {
      field: 'os',
      name: PROPERTY_TITLES.os,
      render(value: TrustedApp['os'], record: Immutable<TrustedApp>) {
        return (
          <TextFieldValue
            fieldName={PROPERTY_TITLES.os}
            value={OS_TITLES[value]}
            className="eui-textTruncate"
          />
        );
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
      render(value: TrustedApp['created_by'], record: Immutable<TrustedApp>) {
        return (
          <TextFieldValue
            fieldName={PROPERTY_TITLES.created_by}
            value={value}
            className="eui-textTruncate"
          />
        );
      },
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
            onClick={() => setItemDetailsMap(toggleItemDetailsInMap(itemDetailsMap, item))}
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
  const pagination = useTrustedAppsSelector(getListPagination);
  const listItems = useTrustedAppsSelector(getListItems);
  const dispatch = useDispatch();

  return (
    <EuiBasicTable
      columns={useMemo(
        () => getColumnDefinitions({ dispatch, detailsMapState: [detailsMap, setDetailsMap] }),
        [dispatch, detailsMap]
      )}
      items={useMemo(() => [...listItems], [listItems])}
      error={useTrustedAppsSelector(getListErrorMessage)}
      loading={useTrustedAppsSelector(isListLoading)}
      itemId="id"
      itemIdToExpandedRowMap={detailsMap}
      isExpandable={true}
      pagination={pagination}
      onChange={useTrustedAppsNavigateCallback(({ page }) => ({
        page_index: page.index,
        page_size: page.size,
      }))}
      data-test-subj="trustedAppsList"
    />
  );
});

TrustedAppsList.displayName = 'TrustedAppsList';
