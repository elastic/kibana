/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import { REFRESH_INTERVALS, WATCH_STATES } from '../../../../common/constants';
import { DeleteWatchesModal } from '../../../components/delete_watches_modal';
import { fetchWatches } from '../../../lib/api';

const stateToIcon: { [key: string]: JSX.Element } = {
  [WATCH_STATES.OK]: <EuiIcon type="check" color="green" />,
  [WATCH_STATES.DISABLED]: <EuiIcon type="minusInCircle" color="grey" />,
  [WATCH_STATES.FIRING]: <EuiIcon type="play" color="primary" />,
  [WATCH_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
  [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="red" />,
};

const WatchListUi = ({ intl }: { intl: InjectedIntl }) => {
  // hooks
  const [isWatchesLoading, setIsWatchesLoading] = useState<boolean>(true);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  const [watches, setWatches] = useState([]);
  const [selection, setSelection] = useState([]);
  const loadWatches = async () => {
    const loadedWatches = await fetchWatches();
    setWatches(loadedWatches);
    setIsWatchesLoading(false);
  };
  useEffect(() => {
    loadWatches();
    const refreshIntervalId = setInterval(loadWatches, REFRESH_INTERVALS.WATCH_LIST);
    return () => {
      clearInterval(refreshIntervalId);
    };
  }, []);
  const columns = [
    {
      field: 'id',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.idHeader', {
        defaultMessage: 'ID',
      }),
      sortable: true,
      truncateText: true,
      render: (id: string) => {
        return (
          <EuiLink
            className="indTable__link euiTableCellContent"
            data-test-subj={`watchIdColumn-${id}`}
            href={`#/management/elasticsearch/watcher/watches/watch/${id}/status`}
          >
            {id}
          </EuiLink>
        );
      },
    },
    {
      field: 'name',˝
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.nameHeader', {
        defaultMessage: 'Name',
      }),
      render: (name: string, item: any) => {
        return (
          <span data-test-subj={`watchNameColumn-${item.id}`}>
            {name}
          </span>
        )
      }
      sortable: true,
      truncateText: true,
    },
    {
      field: 'watchStatus.state',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.stateHeader', {
        defaultMessage: 'State',
      }),
      sortable: true,
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
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.commentHeader', {
        defaultMessage: 'Comment',
      }),
      sortable: true,
      truncateText: true,
    },
    {
      field: 'watchStatus.lastMetCondition',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.lastFiredHeader', {
        defaultMessage: 'Last fired',
      }),
      sortable: true,
      truncateText: true,
      render: (lastMetCondition: Moment) => {
        return lastMetCondition ? lastMetCondition.fromNow() : lastMetCondition;
      },
    },
    {
      field: 'watchStatus.lastChecked',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.lastTriggeredHeader', {
        defaultMessage: 'Last triggered',
      }),
      sortable: true,
      truncateText: true,
      render: (lastChecked: Moment) => {
        return lastChecked ? lastChecked.fromNow() : lastChecked;
      },
    },
    {
      actions: [
        {
          render: (watch: any) => {
            const disabled = watch.isSystemWatch;
            return (
              <EuiButtonEmpty
                iconType="pencil"
                disabled={disabled}
                aria-label={intl.formatMessage({
                  id: 'xpack.watcher.sections.watchList.watchTable.menuEditButtonDescription',
                  defaultMessage: 'Edit watch',
                })}
                href={`#/management/elasticsearch/watcher/watches/watch/${watch.id}/edit`}
              >
                <FormattedMessage
                  id="xpack.watcher.sections.watchList.watchTable.menuEditButtonTitle"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            );
          },
        },
      ],
    },
  ];
  const selectionConfig = {
    onSelectionChange: setSelection,
  };
  const pagination = {
    initialPageSize: 10,
    pageSizeOptions: [10, 50, 100],
  };
  const searchConfig = {
    box: {
      incremental: true,
    },
    toolsRight: (
      <EuiButton
        data-test-subj="btnDeleteWatches"
        onClick={() => {
          setWatchesToDelete(selection.map((selected: any) => selected.id));
        }}
        color="danger"
        disabled={!selection.length}
      >
        <FormattedMessage
          id="xpack.watcher.sections.watchList.deleteWatchButtonLabel"
          defaultMessage="Delete"
        />
      </EuiButton>
    ),
  };
  return (
    <EuiPageContent>
      <DeleteWatchesModal
        callback={(deleted?: string[]) => {
          if (deleted) {
            setWatches(
              watches.filter((watch: any) => {
                return !deleted.includes(watch.id);
              })
            );
          }
          setWatchesToDelete([]);
        }}
        watchesToDelete={watchesToDelete}
      />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiTitle size="m">
            <h1>
              <FormattedMessage
                id="xpack.watcher.sections.watchList.header"
                defaultMessage="Create threshold alert"
              />
            </h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.watcher.sections.watchList.subhead"
                defaultMessage="Send out emails, slack messages and log events when specific parameters are hit"
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="createThresholdAlertButton"
            href="#/management/elasticsearch/watcher/watches/new-watch/threshold"
          >
            <FormattedMessage
              id="xpack.watcher.sections.watchList.createThresholdAlertButtonLabel"
              defaultMessage="Create threshold alert"
            />
          </EuiButton>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="createAdvancedWatchButton"
            href="#/management/elasticsearch/watcher/watches/new-watch/json"
          >
            <FormattedMessage
              id="xpack.watcher.sections.watchList.createAdvancedWatchButtonLabel"
              defaultMessage="Create advanced watch"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiInMemoryTable
        items={watches}
        itemId="id"
        columns={columns}
        search={searchConfig}
        pagination={pagination}
        sorting={true}
        selection={selectionConfig}
        isSelectable={true}
        loading={isWatchesLoading}
        message={
          <FormattedMessage
            id="xpack.watcher.sections.watchList.watchTable.noWatchesMessage"
            defaultMessage="No watches to show"
          />
        }
      />
    </EuiPageContent>
  );
};
export const WatchList = injectI18n(WatchListUi);
