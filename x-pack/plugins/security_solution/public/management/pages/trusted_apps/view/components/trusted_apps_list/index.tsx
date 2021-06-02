/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { EuiBasicTable, EuiBasicTableColumn, EuiButtonIcon, RIGHT_ALIGNMENT } from '@elastic/eui';

import { useHistory } from 'react-router-dom';
import { Immutable, TrustedApp } from '../../../../../../../common/endpoint/types';

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

  return (
    <TrustedAppCard
      trustedApp={trustedApp}
      onEdit={handleOnEdit}
      onDelete={handleOnDelete}
      data-test-subj="trustedAppCard"
    />
  );
});
ExpandedRowContent.displayName = 'ExpandedRowContent';

export const TrustedAppsList = memo(() => {
  const dispatch = useDispatch();

  const [showDetailsFor, setShowDetailsFor] = useState<{ [key: string]: boolean }>({});

  // Cast below is needed because EuiBasicTable expects listItems to be mutable
  const listItems = useTrustedAppsSelector(getListItems) as TrustedApp[];
  const pagination = useTrustedAppsSelector(getListPagination);
  const listError = useTrustedAppsSelector(getListErrorMessage);
  const isLoading = useTrustedAppsSelector(isListLoading);

  const toggleShowDetailsFor = useCallback((trustedAppId) => {
    setShowDetailsFor((prevState) => {
      const newState = { ...prevState };
      if (prevState[trustedAppId]) {
        delete newState[trustedAppId];
      } else {
        newState[trustedAppId] = true;
      }
      return newState;
    });
  }, []);

  const detailsMap = useMemo<DetailsMap>(() => {
    return Object.keys(showDetailsFor).reduce<DetailsMap>((expandMap, trustedAppId) => {
      const trustedApp = listItems.find((ta) => ta.id === trustedAppId);

      if (trustedApp) {
        expandMap[trustedAppId] = <ExpandedRowContent trustedApp={trustedApp} />;
      }

      return expandMap;
    }, {});
  }, [listItems, showDetailsFor]);

  const handleTableOnChange = useTrustedAppsNavigateCallback(({ page }) => ({
    page_index: page.index,
    page_size: page.size,
  }));

  const tableColumns: Array<EuiBasicTableColumn<Immutable<TrustedApp>>> = useMemo(() => {
    return [
      {
        field: 'name',
        name: PROPERTY_TITLES.name,
        'data-test-subj': 'trustedAppNameTableCell',
        render(value: TrustedApp['name']) {
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
        render(value: TrustedApp['os']) {
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
        render(value: TrustedApp['created_at']) {
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
        render(value: TrustedApp['created_by']) {
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
        actions: [
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
        ],
      },
      {
        align: RIGHT_ALIGNMENT,
        width: '40px',
        isExpander: true,
        render({ id }: Immutable<TrustedApp>) {
          return (
            <EuiButtonIcon
              onClick={() => toggleShowDetailsFor(id)}
              aria-label={detailsMap[id] ? 'Collapse' : 'Expand'}
              iconType={detailsMap[id] ? 'arrowUp' : 'arrowDown'}
              data-test-subj="trustedAppsListItemExpandButton"
            />
          );
        },
      },
    ];
  }, [detailsMap, dispatch, toggleShowDetailsFor]);

  return (
    <EuiBasicTable
      columns={tableColumns}
      items={listItems}
      error={listError}
      loading={isLoading}
      itemId="id"
      itemIdToExpandedRowMap={detailsMap}
      isExpandable={true}
      pagination={pagination}
      onChange={handleTableOnChange}
      data-test-subj="trustedAppsList"
    />
  );
});

TrustedAppsList.displayName = 'TrustedAppsList';
