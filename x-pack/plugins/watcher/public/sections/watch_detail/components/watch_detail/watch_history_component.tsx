/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import React, { useEffect, useState } from 'react';

import { fetchWatchHistory, fetchWatchHistoryDetail } from '../../../../lib/api';

import { i18n } from '@kbn/i18n';
import { WATCH_STATES } from '../../../../../common/constants';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

// TODO: remove duplication, [pcs]
const stateToIcon: { [key: string]: JSX.Element } = {
  [WATCH_STATES.OK]: <EuiIcon type="check" color="green" />,
  [WATCH_STATES.DISABLED]: <EuiIcon type="minusInCircle" color="grey" />,
  [WATCH_STATES.FIRING]: <EuiIcon type="play" color="primary" />,
  [WATCH_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
  [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
};

const WatchHistoryUI = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [history, setWatchHistory] = useState([]);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(true);
  const [itemDetail, setItemDetail] = useState<{ id?: string; details?: any; watchId?: string }>(
    {}
  );

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };

  const columns = [
    {
      field: 'startTime',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.startTimeHeader', {
        defaultMessage: 'Trigger Time',
      }),
      sortable: true,
      truncateText: true,
      render: (startTime: Moment, item: any) => {
        const formattedDate = startTime.format();
        // "#/management/elasticsearch/watcher/watches/watch/{{watchHistoryTable.watch.id}}/history-item/{{item.historyItem.id}}"
        // href={`#/management/elasticsearch/watcher/watches/watch/${watchId}/history-item/${watchId}`}
        return (
          <EuiLink
            className="indTable__link euiTableCellContent"
            data-test-subj={`watchIdColumn-${formattedDate}`}
            onClick={() => showDetailFlyout(item)}
          >
            {formattedDate}
          </EuiLink>
        );
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
        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>{stateToIcon[state]}</EuiFlexItem>
            <EuiFlexItem grow={false} className="watchState__message">
              <EuiText>{state}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
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

  const hideDetailFlyout = async () => {
    setItemDetail({});
    return setIsDetailVisible(false);
  };

  const showDetailFlyout = async (item: { id: string }) => {
    const watchHistoryItemDetail = await fetchWatchHistoryDetail(item.id);
    // console.log(watchHistoryItemDetail);
    setItemDetail(watchHistoryItemDetail);
    return setIsDetailVisible(true);
  };

  useEffect(() => {
    loadWatchHistory();
    // only run the first time the component loads
  }, []);

  let flyout;

  if (isDetailVisible && Object.keys(itemDetail).length !== 0) {
    flyout = (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={hideDetailFlyout}
        aria-labelledby="indexDetailsFlyoutTitle"
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>{itemDetail.watchId}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        {itemDetail.id}
      </EuiFlyout>
    );
  }
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
      {flyout}
    </EuiPageContent>
  );
};

export const WatchHistory = injectI18n(WatchHistoryUI);
