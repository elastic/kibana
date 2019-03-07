/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import React, { useEffect, useState } from 'react';

import { fetchWatchHistory } from '../../../../lib/api';

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

const WatchHistoryUI = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [history, setWatchHistory] = useState([]);

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };

  const columns = [
    {
      field: 'startTime',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.startTimeHeader', {
        defaultMessage: 'Start Time',
      }),
      sortable: true,
      truncateText: true,
      render: (startTime: Moment) => {
        return startTime ? startTime.fromNow() : startTime;
      },
    },
    {
      field: 'watchStatus.state',
      name: i18n.translate('xpack.watcher.sections.watchHistory.watchTable.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: true,
      truncateText: true,
      render: (state: string) => {
        return <EuiText>{state}</EuiText>;
      },
    },
    {
      field: 'watchStatus.comment',
      name: i18n.translate('xpack.watcher.sections.watchHistory.watchTable.commentHeader', {
        defaultMessage: 'Comment',
      }),
      sortable: true,
      truncateText: true,
      render: (comment: string) => {
        return <EuiText>{comment}</EuiText>;
      },
    },
  ];
  const loadWatchHistory = async () => {
    const loadedWatchHistory = await fetchWatchHistory(watchId, 'now-1h');
    setWatchHistory(loadedWatchHistory);
    setIsLoading(false);
  };
  useEffect(() => {
    loadWatchHistory();
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
                defaultMessage="Watch History"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiInMemoryTable
            items={history}
            itemId="id"
            columns={columns}
            pagination={pagination}
            sorting={true}
            loading={isLoading}
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

export const WatchHistory = injectI18n(WatchHistoryUI);
