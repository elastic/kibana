/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Immutable } from '../../../../../common/endpoint/types';
import { TrustedApp } from '../../../../../common/endpoint/types/trusted_apps';
import { getTrustedAppsListPath } from '../../../common/routing';

import {
  getCurrentError,
  getLastPresentData,
  isInProgressBinding,
} from '../state/async_data_binding';
import { PageInfo } from '../state/items_page';
import { ListViewState } from '../state/list_view_state';

interface TrustedAppsListProps {
  state: Immutable<ListViewState<TrustedApp>>;
}

export function TrustedAppsList(props: TrustedAppsListProps) {
  const data = getLastPresentData(props.state.currentPage);
  const history = useHistory();

  return (
    <EuiBasicTable
      items={[...(data?.items || [])]}
      columns={[
        {
          field: 'name',
          name: i18n.translate('xpack.securitySolution.trustedapps.list.columns.name', {
            defaultMessage: 'Name',
          }),
        },
        {
          field: 'os',
          name: i18n.translate('xpack.securitySolution.trustedapps.list.columns.os', {
            defaultMessage: 'OS',
          }),
        },
        {
          field: 'created_at',
          name: i18n.translate('xpack.securitySolution.trustedapps.list.columns.createdAt', {
            defaultMessage: 'Date Created',
          }),
        },
        {
          field: 'created_by',
          name: i18n.translate('xpack.securitySolution.trustedapps.list.columns.createdBy', {
            defaultMessage: 'Created By',
          }),
        },
      ]}
      error={getCurrentError(props.state.currentPage)?.message}
      pagination={{
        pageIndex: props.state.currentPageInfo.index - 1,
        pageSize: props.state.currentPageInfo.size,
        totalItemCount: data?.totalItemsCount || 0,
      }}
      onChange={({ page }: { page: PageInfo }) => {
        history.push(
          getTrustedAppsListPath({
            page_index: page.index + 1,
            page_size: page.size,
          })
        );
      }}
      loading={isInProgressBinding(props.state.currentPage)}
    />
  );
}
