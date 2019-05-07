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
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { PAGINATION } from '../../../../common/constants';
import { goToWatchList } from '../../../lib/navigation';
import { getPageErrorCode, PageError, WatchStatus, DeleteWatchesModal } from '../../../components';
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

const WatchHistoryUi = ({ intl, watchId }: { intl: InjectedIntl; watchId: string }) => {
  const [isActivated, setIsActivated] = useState<boolean | undefined>(undefined);
  const [detailWatchId, setDetailWatchId] = useState<string | undefined>(undefined);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);

  const [watchHistoryTimeSpan, setWatchHistoryTimeSpan] = useState<string>(
    watchHistoryTimeSpanOptions[0].value
  );

  const { error: watchDetailError, data: loadedWatch } = loadWatchDetail(watchId);

  if (loadedWatch && isActivated === undefined) {
    // Set initial value for isActivated based on the watch we just loaded.
    setIsActivated(loadedWatch.watchStatus.isActive);
  }

  const { error: historyError, data: history, isLoading } = loadWatchHistory(
    watchId,
    watchHistoryTimeSpan
  );

  const { error: watchHistoryDetailsError, data: watchHistoryDetails } = loadWatchHistoryDetail(
    detailWatchId
  );

  const executionDetail = watchHistoryDetails
    ? JSON.stringify(watchHistoryDetails.details, null, 2)
    : '';

  const errorCode = getPageErrorCode([watchDetailError, historyError, watchHistoryDetailsError]);
  if (errorCode) {
    return <PageError errorCode={errorCode} id={watchId} />;
  }

  const columns = [
    {
      field: 'startTime',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.startTimeHeader', {
        defaultMessage: 'Trigger time',
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
      render: (state: string) => <WatchStatus status={state} />,
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
        render: (state: string) => <WatchStatus status={state} />,
      },
    ];

    flyout = (
      <EuiFlyout
        data-test-subj="indexDetailFlyout"
        onClose={() => setDetailWatchId(undefined)}
        aria-labelledby="indexDetailsFlyoutTitle"
        maxWidth={600}
      >
        <EuiFlyoutHeader>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.watcher.sections.watchHistory.watchHistoryDetail.title"
                defaultMessage="Executed on {date}"
                values={{ date: watchHistoryDetails.startTime }}
              />
            </h3>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.watcher.sections.watchHistory.watchHistoryDetail.actionsTitle"
                defaultMessage="Actions"
              />
            </h4>
          </EuiTitle>

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

          <EuiSpacer />

          <EuiTitle size="xs">
            <h4>
              <FormattedMessage
                id="xpack.watcher.sections.watchHistory.watchHistoryDetail.jsonTitle"
                defaultMessage="JSON"
              />
            </h4>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiCodeBlock language="json">{executionDetail}</EuiCodeBlock>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  const activationButtonText = isActivated ? (
    <FormattedMessage
      id="xpack.watcher.sections.watchHistory.watchTable.deactivateWatchLabel"
      defaultMessage="Deactivate watch"
    />
  ) : (
    <FormattedMessage
      id="xpack.watcher.sections.watchHistory.watchTable.activateWatchLabel"
      defaultMessage="Activate watch"
    />
  );

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
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.watcher.sections.watchHistory.header"
                defaultMessage="Execution history"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={watchHistoryTimeSpanOptions}
                value={watchHistoryTimeSpan}
                onChange={onTimespanChange}
                aria-label={i18n.translate(
                  'xpack.watcher.sections.watchHistory.changeTimespanSelectAriaLabel',
                  {
                    defaultMessage: 'Change timespan of watch history',
                  }
                )}
              />
            </EuiFlexItem>
            {loadedWatch && !loadedWatch.isSystemWatch && (
              <Fragment>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={() => toggleWatchActivation()}>
                    {activationButtonText}
                  </EuiButton>
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
              </Fragment>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiInMemoryTable
        items={history}
        columns={columns}
        pagination={PAGINATION}
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

export const WatchHistory = injectI18n(WatchHistoryUi);
