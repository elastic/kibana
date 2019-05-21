/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useMemo, useEffect, Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiPageContent,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiEmptyPrompt,
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { Moment } from 'moment';
import chrome from 'ui/chrome';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

import { REFRESH_INTERVALS, PAGINATION } from '../../../../common/constants';
import { listBreadcrumb } from '../../../lib/breadcrumbs';
import { getPageErrorCode, PageError, DeleteWatchesModal, WatchStatus } from '../../../components';
import { loadWatches } from '../../../lib/api';
import { watcherGettingStartedUrl } from '../../../lib/documentation_links';

const WatchListUi = () => {
  // hooks
  const [selection, setSelection] = useState([]);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  // Filter out deleted watches on the client, because the API will return 200 even though some watches
  // may not really be deleted until after they're done firing and this could take some time.
  const [deletedWatches, setDeletedWatches] = useState<string[]>([]);

  useEffect(() => {
    chrome.breadcrumbs.set([MANAGEMENT_BREADCRUMB, listBreadcrumb]);
  }, []);

  const { isLoading: isWatchesLoading, data: watches, error } = loadWatches(
    REFRESH_INTERVALS.WATCH_LIST
  );

  const availableWatches = useMemo(
    () =>
      watches ? watches.filter((watch: any) => !deletedWatches.includes(watch.id)) : undefined,
    [watches, deletedWatches]
  );

  const createWatchButtons = (
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
            iconType="plusInCircle"
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
            iconType="plusInCircle"
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
  );

  if (getPageErrorCode(error)) {
    return (
      <EuiPageContent>
        <PageError />
      </EuiPageContent>
    );
  }

  let content;

  if (availableWatches && availableWatches.length === 0) {
    content = (
      <EuiEmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.watcher.sections.watchList.emptyPromptTitle"
              defaultMessage="You don't have any watches yet"
            />
          </h1>
        }
        body={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.watcher.sections.watchList.emptyPromptDescription"
                defaultMessage="Start by creating a watch."
              />
            </p>
          </Fragment>
        }
        actions={createWatchButtons}
      />
    );
  } else {
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
        width: '130px',
        render: (state: string) => <WatchStatus status={state} />,
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
        width: '130px',
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
        width: '130px',
        render: (lastChecked: Moment) => {
          return lastChecked ? lastChecked.fromNow() : lastChecked;
        },
      },
      {
        name: i18n.translate('xpack.watcher.sections.watchList.watchTable.actionHeader', {
          defaultMessage: 'Actions',
        }),
        width: '75px',
        actions: [
          {
            render: (watch: any) => {
              const label = i18n.translate(
                'xpack.watcher.sections.watchList.watchTable.actionEditTooltipLabel',
                { defaultMessage: 'Edit' }
              );
              return (
                <EuiToolTip content={label} delay="long">
                  <EuiButtonIcon
                    isDisabled={watch.isSystemWatch}
                    aria-label={i18n.translate(
                      'xpack.watcher.sections.watchList.watchTable.actionEditAriaLabel',
                      {
                        defaultMessage: 'Edit watch `{name}`',
                        values: { name: watch.name },
                      }
                    )}
                    iconType="pencil"
                    color="primary"
                    href={`#/management/elasticsearch/watcher/watches/watch/${watch.id}/edit`}
                  />
                </EuiToolTip>
              );
            },
          },
          {
            render: (watch: any) => {
              const label = i18n.translate(
                'xpack.watcher.sections.watchList.watchTable.actionDeleteTooltipLabel',
                { defaultMessage: 'Delete' }
              );
              return (
                <EuiToolTip content={label} delay="long">
                  <EuiButtonIcon
                    isDisabled={watch.isSystemWatch}
                    aria-label={i18n.translate(
                      'xpack.watcher.sections.watchList.watchTable.actionDeleteAriaLabel',
                      {
                        defaultMessage: 'Delete watch `{name}`',
                        values: { name: watch.name },
                      }
                    )}
                    iconType="trash"
                    color="danger"
                    onClick={() => {
                      setWatchesToDelete([watch.id]);
                    }}
                  />
                </EuiToolTip>
              );
            },
          },
        ],
      },
    ];

    const selectionConfig = {
      onSelectionChange: setSelection,
      selectable: (watch: any) => !watch.isSystemWatch,
      selectableMessage: (selectable: boolean) =>
        !selectable
          ? i18n.translate('xpack.watcher.sections.watchList.watchTable.disabledWatchTooltipText', {
              defaultMessage: 'This watch is read-only',
            })
          : undefined,
    };

    const searchConfig = {
      box: {
        incremental: true,
      },
      toolsLeft: selection.length && (
        <EuiButton
          data-test-subj="btnDeleteWatches"
          onClick={() => {
            setWatchesToDelete(selection.map((selected: any) => selected.id));
          }}
          color="danger"
        >
          {selection.length > 1 ? (
            <FormattedMessage
              id="xpack.watcher.sections.watchList.deleteMultipleWatchesButtonLabel"
              defaultMessage="Delete watches"
            />
          ) : (
            <FormattedMessage
              id="xpack.watcher.sections.watchList.deleteSingleWatchButtonLabel"
              defaultMessage="Delete watch"
            />
          )}
        </EuiButton>
      ),
      toolsRight: createWatchButtons,
    };

    content = (
      <EuiInMemoryTable
        items={availableWatches}
        itemId="id"
        columns={columns}
        search={searchConfig}
        pagination={PAGINATION}
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
    );
  }

  return (
    <EuiPageContent>
      <DeleteWatchesModal
        callback={(deleted?: string[]) => {
          if (deleted) {
            setDeletedWatches([...deletedWatches, ...watchesToDelete]);
          }
          setWatchesToDelete([]);
        }}
        watchesToDelete={watchesToDelete}
      />

      <EuiTitle size="l">
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={true}>
            <h1>
              <FormattedMessage
                id="xpack.watcher.sections.watchList.header"
                defaultMessage="Watcher"
              />
            </h1>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty href={watcherGettingStartedUrl} target="_blank" iconType="help">
              <FormattedMessage
                id="xpack.watcher.sections.watchList.watcherGettingStartedDocsLinkText"
                defaultMessage="Watcher docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiTitle size="s">
        <EuiText color="subdued">
          <FormattedMessage
            id="xpack.watcher.sections.watchList.subhead"
            defaultMessage="Use watcher to watch for changes or anomalies in your data and perform the necessary actions in response."
          />
        </EuiText>
      </EuiTitle>

      <EuiSpacer size="xl" />

      {content}
    </EuiPageContent>
  );
};

export const WatchList = injectI18n(WatchListUi);
