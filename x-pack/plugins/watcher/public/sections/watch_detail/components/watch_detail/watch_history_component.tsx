/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import React, { useEffect, useState } from 'react';

import {
  activateWatch,
  deactivateWatch,
  fetchWatchHistory,
  fetchWatchHistoryDetail,
} from '../../../../lib/api';

import { i18n } from '@kbn/i18n';
import { WATCH_STATES } from '../../../../../common/constants';

import {
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { DeleteWatchesModal } from 'x-pack/plugins/watcher/public/components/delete_watches_modal';

// TODO: remove duplication, [pcs]
const stateToIcon: { [key: string]: JSX.Element } = {
  [WATCH_STATES.OK]: <EuiIcon type="check" color="green" />,
  [WATCH_STATES.DISABLED]: <EuiIcon type="minusInCircle" color="grey" />,
  [WATCH_STATES.FIRING]: <EuiIcon type="play" color="primary" />,
  [WATCH_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
  [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
};

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
  const [executionDetail, setExecutionDetail] = useState<string>(null);

  const kbnUrlService = urlService;

  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };

  const watchHistoryTimeSpanOptions = [
    { value: 'now-1h', text: 'Last one hour' },
    { value: 'now-24h', text: 'Last 24 hours' },
    { value: 'now-7d', text: 'Last 7 days' },
    { value: 'now-30d', text: 'Last 30 days' },
    { value: 'now-6M', text: 'Last 6 months' },
    { value: 'now-1y', text: 'Last 1 year' },
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
            <h2>Watch History Detail</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          <EuiFlexItem>
            {/* TODO[pcs] this `as any` kind of casting is a bit of a hack */}
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
  const activationButtonText = isActivated ? 'Deactivate Watch' : 'Activate Watch';
  return (
    <EuiPageContent>
      <DeleteWatchesModal
        callback={(deleted?: string[]) => {
          if (deleted) {
            kbnUrlService.redirect('/management/elasticsearch/watcher/watches');
          }
          setWatchesToDelete([]);
        }}
        watchesToDelete={watchesToDelete}
      />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiSelect
            options={watchHistoryTimeSpanOptions}
            value={watchHistoryTimeSpan}
            onChange={onTimespanChange}
            // TODO[pcs]: define aria labels
            aria-label=""
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
