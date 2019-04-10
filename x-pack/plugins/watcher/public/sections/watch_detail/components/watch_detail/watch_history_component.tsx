/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import React, { Fragment, useEffect, useState } from 'react';

import {
  activateWatch,
  deactivateWatch,
  fetchWatchHistory,
  fetchWatchHistoryDetail,
} from '../../../../lib/api';

import { i18n } from '@kbn/i18n';

import { WatchActionStatus } from './watch_action_status';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { DeleteWatchesModal } from 'x-pack/plugins/watcher/public/components/delete_watches_modal';

const WatchHistoryUI = ({
  intl,
  watchId,
  urlService,
}: {
  intl: InjectedIntl;
  watchId: string;
  urlService: any;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActivated, setIsActivated] = useState<boolean>(true);
  const [history, setWatchHistory] = useState([]);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(true);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  const [itemDetail, setItemDetail] = useState<{
    id?: string;
    details?: any;
    watchId?: string;
    watchStatus?: { actionStatuses?: any };
  }>({});
  const [executionDetail, setExecutionDetail] = useState<string>('');

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };

  const watchHistoryTimeSpanOptions = [
    {
      value: 'now-1h',
      text: i18n.translate('xpack.watcher.sections.watchHistory.timeSpan.1h', {
        defaultMessage: 'Last one hour',
      }),
    },
    {
      value: 'now-24h',
      text: i18n.translate('xpack.watcher.sections.watchHistory.timeSpan.24h', {
        defaultMessage: 'Last 24 hours',
      }),
    },
    {
      value: 'now-7d',
      text: i18n.translate('xpack.watcher.sections.watchHistory.timeSpan.7d', {
        defaultMessage: 'Last 7 days',
      }),
    },
    {
      value: 'now-30d',
      text: i18n.translate('xpack.watcher.sections.watchHistory.timeSpan.30d', {
        defaultMessage: 'Last 30 days',
      }),
    },
    {
      value: 'now-6M',
      text: i18n.translate('xpack.watcher.sections.watchHistory.timeSpan.6M', {
        defaultMessage: 'Last 6 months',
      }),
    },
    {
      value: 'now-1y',
      text: i18n.translate('xpack.watcher.sections.watchHistory.timeSpan.1y', {
        defaultMessage: 'Last 1 year',
      }),
    },
  ];
  const [watchHistoryTimeSpan, setWatchHistoryTimeSpan] = useState<string>(
    watchHistoryTimeSpanOptions[0].value
  );

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

  const onTimespanChange = (e: any) => {
    const timespan = e.target.value;
    setWatchHistoryTimeSpan(timespan);
    loadWatchHistory(timespan);
  };
  const loadWatchHistory = async (timespan: string) => {
    const loadedWatchHistory = await fetchWatchHistory(watchId, timespan);
    setWatchHistory(loadedWatchHistory);
    setIsLoading(false);
  };

  const hideDetailFlyout = async () => {
    setItemDetail({});
    return setIsDetailVisible(false);
  };

  const showDetailFlyout = async (item: { id: string }) => {
    const watchHistoryItemDetail = await fetchWatchHistoryDetail(item.id);
    setItemDetail(watchHistoryItemDetail);
    setExecutionDetail(JSON.stringify(watchHistoryItemDetail.details, null, 2));
    return setIsDetailVisible(true);
  };

  const toggleWatchActivation = async () => {
    if (isActivated) {
      await deactivateWatch(watchId);
    } else {
      await activateWatch(watchId);
    }
    // TODO[pcs]: error handling, response checking, etc...
    setIsActivated(!isActivated);
  };

  useEffect(() => {
    loadWatchHistory(watchHistoryTimeSpan);
    // only run the first time the component loads
  }, []);

  let flyout;

  if (isDetailVisible && Object.keys(itemDetail).length !== 0) {
    const detailColumns = [
      {
        field: 'id',
        name: i18n.translate('xpack.watcher.sections.watchList.watchActionStatusTable.id', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        truncateText: true,
        render: (id: string) => {
          return <EuiText>{id}</EuiText>;
        },
      },
      {
        field: 'state',
        name: i18n.translate('xpack.watcher.sections.watchList.watchActionStatusTable.id', {
          defaultMessage: 'State',
        }),
        sortable: true,
        truncateText: true,
        render: (state: string) => {
          return <EuiText>{state}</EuiText>;
        },
      },
    ];

    flyout = (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={hideDetailFlyout}
        aria-labelledby="indexDetailsFlyoutTitle"
      >
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>Watch history detail</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem>
            <EuiInMemoryTable
              items={(itemDetail.watchStatus as any).actionStatuses}
              itemId="id"
              columns={detailColumns}
              message={
                <FormattedMessage
                  id="xpack.watcher.sections.watchDetail.watchTable.noWatchesMessage"
                  defaultMessage="No current status to show"
                />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem>
            <EuiCodeBlock language="javascript">{executionDetail}</EuiCodeBlock>
            <EuiSpacer />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyout>
    );
  }
  const activationButtonText = isActivated ? 'Deactivate watch' : 'Activate watch';
  return (
    <Fragment>
      <DeleteWatchesModal
        callback={(deleted?: string[]) => {
          if (deleted) {
            urlService.redirect('/management/elasticsearch/watcher/watches');
          }
          setWatchesToDelete([]);
        }}
        watchesToDelete={watchesToDelete}
      />
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.watcher.sections.watchDetail.header"
                defaultMessage="Watch history"
              />
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={watchHistoryTimeSpanOptions}
                value={watchHistoryTimeSpan}
                onChange={onTimespanChange}
                aria-label="Change timespan of watch history"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => toggleWatchActivation()}>{activationButtonText}</EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="btnDeleteWatch"
                onClick={() => {
                  setWatchesToDelete([watchId]);
                }}
                color="danger"
                disabled={false}
              >
                <FormattedMessage
                  id="xpack.watcher.sections.watchList.deleteWatchButtonLabel"
                  defaultMessage="Delete"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

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
            defaultMessage="No current status"
          />
        }
      />
      {flyout}
    </Fragment>
  );
};

export const WatchHistory = injectI18n(WatchHistoryUI);
