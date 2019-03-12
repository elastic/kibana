/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useEffect, useState } from 'react';

import { fetchWatchDetail } from '../../../../lib/api';

import { i18n } from '@kbn/i18n';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

const WatchDetailUi = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const [isWatchesLoading, setIsWatchesLoading] = useState<boolean>(true);
  const [actions, setWatchActions] = useState([]);

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
  ];
  const loadWatchActions = async () => {
    const loadedWatchActions = await fetchWatchDetail(watchId);
    setWatchActions(loadedWatchActions);
    setIsWatchesLoading(false);
  };
  useEffect(() => {
    loadWatchActions();
    // only run the first time the component loads
  }, []);

  return (
    <EuiPageContent>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.watcher.sections.watchDetail.header"
                defaultMessage="Current Status"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiInMemoryTable
            items={actions}
            itemId="id"
            columns={columns}
            pagination={pagination}
            sorting={true}
            loading={isWatchesLoading}
            message={
              <FormattedMessage
                id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
                defaultMessage="No current status to show"
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageContent>
  );
};

export const WatchDetail = injectI18n(WatchDetailUi);
