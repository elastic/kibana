/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Immutable } from '../../../../../common/endpoint/types';
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
import { OS_TITLES } from './constants';

const COLUMN_TITLES: Readonly<{ [K in keyof Omit<TrustedApp, 'id' | 'entries'>]: string }> = {
  name: i18n.translate('xpack.securitySolution.trustedapps.list.columns.name', {
    defaultMessage: 'Name',
  }),
  os: i18n.translate('xpack.securitySolution.trustedapps.list.columns.os', {
    defaultMessage: 'OS',
  }),
  created_at: i18n.translate('xpack.securitySolution.trustedapps.list.columns.createdAt', {
    defaultMessage: 'Date Created',
  }),
  created_by: i18n.translate('xpack.securitySolution.trustedapps.list.columns.createdBy', {
    defaultMessage: 'Created By',
  }),
};

const getColumnDefinitions = (): Array<EuiBasicTableColumn<Immutable<TrustedApp>>> => [
  {
    field: 'name',
    name: COLUMN_TITLES.name,
  },
  {
    field: 'os',
    name: COLUMN_TITLES.os,
    render(value: TrustedApp['os'], record: Immutable<TrustedApp>) {
      return OS_TITLES[value];
    },
  },
  {
    field: 'created_at',
    name: COLUMN_TITLES.created_at,
    render(value: TrustedApp['created_at'], record: Immutable<TrustedApp>) {
      return (
        <FormattedDate
          fieldName={COLUMN_TITLES.created_at}
          value={value}
          className="eui-textTruncate"
        />
      );
    },
  },
  {
    field: 'created_by',
    name: COLUMN_TITLES.created_by,
  },
];

export const TrustedAppsList = memo(() => {
  const pageIndex = useTrustedAppsSelector(getListCurrentPageIndex);
  const pageSize = useTrustedAppsSelector(getListCurrentPageSize);
  const totalItemCount = useTrustedAppsSelector(getListTotalItemsCount);
  const listItems = useTrustedAppsSelector(getListItems);
  const history = useHistory();

  return (
    <EuiBasicTable
      columns={useMemo(getColumnDefinitions, [])}
      items={useMemo(() => [...listItems], [listItems])}
      error={useTrustedAppsSelector(getListErrorMessage)}
      loading={useTrustedAppsSelector(isListLoading)}
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
    />
  );
});

TrustedAppsList.displayName = 'TrustedAppsList';
