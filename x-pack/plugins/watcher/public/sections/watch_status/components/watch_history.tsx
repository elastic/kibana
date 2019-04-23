/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';

import { toastNotifications } from 'ui/notify';
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

import { goToWatchList } from '../../../lib/navigation';
import { DeleteWatchesModal } from '../../../components/delete_watches_modal';
import { WatchActionStatus } from './watch_action_status';
import {
  activateWatch,
  deactivateWatch,
  loadWatchDetail,
  loadWatchHistory,
  loadWatchHistoryDetail,
} from '../../../lib/api';

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

const WatchHistoryUI = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const [isActivated, setIsActivated] = useState<boolean | undefined>(undefined);
  const [detailWatchId, setDetailWatchId] = useState<string | undefined>(undefined);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);

  const [watchHistoryTimeSpan, setWatchHistoryTimeSpan] = useState<string>(
    watchHistoryTimeSpanOptions[0].value
  );

  const { data: loadedWatch } = loadWatchDetail(watchId);

  if (loadedWatch && isActivated === undefined) {
    // Set initial value for isActivated based on the watch we just loaded.
    setIsActivated(loadedWatch.watchStatus.isActive);
  }

  const {
    data: history,
    isLoading,
  } = loadWatchHistory(watchId, watchHistoryTimeSpan);

  const { data: watchHistoryDetails } = loadWatchHistoryDetail(detailWatchId);
  const executionDetail = watchHistoryDetails ? JSON.stringify(watchHistoryDetails.details, null, 2) : '';

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
        return (
          <EuiLink
            className="indTable__link euiTableCellContent"
            data-test-subj={`watchIdColumn-${formattedDate}`}
            onClick={() => setDetailWatchId(item.id)}
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

  const onTimespanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timespan = e.target.value;
    setWatchHistoryTimeSpan(timespan);
  };

  const toggleWatchActivation = async () => {
    try {
      if (isActivated) {
        await deactivateWatch(watchId);
      } else {
        await activateWatch(watchId);
      }

      setIsActivated(!isActivated);
    } catch (e) {
      if (e.data.statusCode !== 200) {
        toastNotifications.addDanger(
          i18n.translate(
            'xpack.watcher.sections.watchList.deactivateWatchErrorNotification.descriptionText',
            {
              defaultMessage: "Couldn't deactivate watch",
            }
          )
        );
      }
    }
  };

  let flyout;

  if (detailWatchId !== undefined && watchHistoryDetails !== undefined) {
    const detailColumns = [
      {
        field: 'id',
        name: i18n.translate('xpack.watcher.sections.watchHistory.watchActionStatusTable.id', {
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
        name: i18n.translate('xpack.watcher.sections.watchHistory.watchActionStatusTable.state', {
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
        onClose={() => setDetailWatchId(undefined)}
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
              items={(watchHistoryDetails.watchStatus as any).actionStatuses}
              itemId="id"
              columns={detailColumns}
              message={
                <FormattedMessage
                  id="xpack.watcher.sections.watchHistory.watchTable.noWatchesMessage"
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
            goToWatchList();
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
                id="xpack.watcher.sections.watchHistory.header"
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
                  id="xpack.watcher.sections.watchHistory.deleteWatchButtonLabel"
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
            id="xpack.watcher.sections.watchHistory.watchTable.noCurrentStatus"
            defaultMessage="No current status"
          />
        }
      />
      {flyout}
    </Fragment>
  );
};

export const WatchHistory = injectI18n(WatchHistoryUI);
