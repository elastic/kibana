/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo } from 'react';

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
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import { REFRESH_INTERVALS, WATCH_STATES } from '../../../../common/constants';
import { DeleteWatchesModal } from '../../../components/delete_watches_modal';
import { getPageErrorCode, PageError } from '../../../components/page_error';
import { loadWatches } from '../../../lib/api';

const stateToIcon: { [key: string]: JSX.Element } = {
  [WATCH_STATES.OK]: <EuiIcon type="check" color="green" />,
  [WATCH_STATES.DISABLED]: <EuiIcon type="minusInCircle" color="euiColorMediumShade" />,
  [WATCH_STATES.FIRING]: <EuiIcon type="play" color="euiColorPrimary" />,
  [WATCH_STATES.ERROR]: <EuiIcon type="crossInACircleFilled" color="euiColorDanger" />,
  [WATCH_STATES.CONFIG_ERROR]: <EuiIcon type="crossInACircleFilled" color="euiColorDanger" />,
};

const WatchListUi = ({ intl }: { intl: InjectedIntl }) => {
  // hooks
  const [selection, setSelection] = useState([]);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  const [deletedWatches, setDeletedWatches] = useState<string[]>([]);

  const { isLoading: isWatchesLoading, data: watches, error } = loadWatches(
    REFRESH_INTERVALS.WATCH_LIST
  );

  const availableWatches = useMemo(
    () =>
      watches ? watches.filter((watch: any) => !deletedWatches.includes(watch.id)) : undefined,
    [watches, deletedWatches]
  );

  if (getPageErrorCode(error)) {
    return (
      <EuiPageContent>
        <PageError />
      </EuiPageContent>
    );
  }

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
      field: 'name',
      name: i18n.translate('xpack.watcher.sections.watchList.watchTable.nameHeader', {
        defaultMessage: 'Name',
      }),
      render: (name: string, item: any) => {
        return <span data-test-subj={`watchNameColumn-${item.id}`}>{name}</span>;
      },
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
            setDeletedWatches(watchesToDelete);
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
          <EuiToolTip
            position="top"
            content={
              <FormattedMessage
                id="xpack.watcher.sections.watchList.createThresholdAlertButtonTooltip"
                defaultMessage="Send an alert on a specific condition"
              />
            }
          >
            <EuiButton
              data-test-subj="createThresholdAlertButton"
              href="#/management/elasticsearch/watcher/watches/new-watch/threshold"
            >
              <FormattedMessage
                id="xpack.watcher.sections.watchList.createThresholdAlertButtonLabel"
                defaultMessage="Create threshold alert"
              />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="top"
            content={
              <FormattedMessage
                id="xpack.watcher.sections.watchList.createAdvancedWatchTooltip"
                defaultMessage="Set up a custom watch in raw JSON"
              />
            }
          >
            <EuiButton
              data-test-subj="createAdvancedWatchButton"
              href="#/management/elasticsearch/watcher/watches/new-watch/json"
            >
              <FormattedMessage
                id="xpack.watcher.sections.watchList.createAdvancedWatchButtonLabel"
                defaultMessage="Create advanced watch"
              />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiInMemoryTable
        items={availableWatches}
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
