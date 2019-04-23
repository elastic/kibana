/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { loadWatchDetail } from '../../../lib/api';
import { WatchActionStatus } from './watch_action_status';

const WatchDetailUi = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };

  const columns = [
    {
      field: 'id',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.actionHeader', {
        defaultMessage: 'Action',
      }),
      sortable: true,
      truncateText: true,
      render: (action: string) => {
        return <EuiText>{action}</EuiText>;
      },
    },
    {
      field: 'state',
      name: i18n.translate('xpack.watcher.sections.watchDetail.watchTable.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: true,
      truncateText: true,
      render: (state: string) => {
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <WatchActionStatus watchState={state} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="watchState__message">
              <EuiText>{state}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
  ];

  const { error, data: watchDetail, isLoading } = loadWatchDetail(watchId);

  // Another part of the UI will surface the no-permissions error.
  if (error && error.status === 403) {
    return null;
  }

  return (
    <Fragment>
      <EuiTitle size="m">
        <h1>
          <FormattedMessage
            id="xpack.watcher.sections.watchDetail.header"
            defaultMessage="Current status"
          />
        </h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiInMemoryTable
        items={watchDetail ? watchDetail.actions : []}
        itemId="id"
        columns={columns}
        pagination={pagination}
        sorting={true}
        loading={isLoading}
        message={
          <FormattedMessage
            id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
            defaultMessage="No current status"
          />
        }
      />
    </Fragment>
  );
};

export const WatchDetail = injectI18n(WatchDetailUi);
