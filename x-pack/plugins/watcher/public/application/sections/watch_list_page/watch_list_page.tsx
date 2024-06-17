/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect, Fragment } from 'react';

import {
  CriteriaWithPagination,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiInMemoryTable,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSearchBarOnChangeArgs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Moment } from 'moment';

import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';

import { REFRESH_INTERVALS, PAGINATION, WATCH_TYPES } from '../../../../common/constants';
import { listBreadcrumb } from '../../lib/breadcrumbs';
import {
  getPageErrorCode,
  PageError,
  DeleteWatchesModal,
  WatchStateBadge,
  SectionLoading,
  Error,
} from '../../components';
import { useLoadWatches } from '../../lib/api';
import { goToCreateThresholdAlert, goToCreateAdvancedWatch } from '../../lib/navigation';
import { useAppContext } from '../../app_context';
import { PageError as GenericPageError } from '../../shared_imports';

/*
 * EuiMemoryTable relies on referential equality of a column's name field when sorting by that column.
 * Therefore, we want the JSX elements preserved through renders.
 */
const stateColumnHeader = (
  <EuiToolTip
    content={i18n.translate('xpack.watcher.sections.watchList.watchTable.stateHeader.tooltipText', {
      defaultMessage: 'Active, inactive, or error.',
    })}
  >
    <span>
      {i18n.translate('xpack.watcher.sections.watchList.watchTable.stateHeader', {
        defaultMessage: 'State',
      })}{' '}
      <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
    </span>
  </EuiToolTip>
);

const conditionLastMetHeader = (
  <EuiToolTip
    content={i18n.translate(
      'xpack.watcher.sections.watchList.watchTable.lastFiredHeader.tooltipText',
      {
        defaultMessage: `The last time the condition was met and action taken.`,
      }
    )}
  >
    <span>
      {i18n.translate('xpack.watcher.sections.watchList.watchTable.lastFiredHeader', {
        defaultMessage: 'Condition last met',
      })}{' '}
      <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
    </span>
  </EuiToolTip>
);

const lastCheckedHeader = (
  <EuiToolTip
    content={i18n.translate(
      'xpack.watcher.sections.watchList.watchTable.lastTriggeredHeader.tooltipText',
      {
        defaultMessage: `The last time the condition was checked.`,
      }
    )}
  >
    <span>
      {i18n.translate('xpack.watcher.sections.watchList.watchTable.lastTriggeredHeader', {
        defaultMessage: 'Last checked',
      })}{' '}
      <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
    </span>
  </EuiToolTip>
);

const commentHeader = (
  <EuiToolTip
    content={i18n.translate(
      'xpack.watcher.sections.watchList.watchTable.commentHeader.tooltipText',
      {
        defaultMessage:
          'Whether any actions have been acknowledged, throttled, or failed to execute.',
      }
    )}
  >
    <span>
      {i18n.translate('xpack.watcher.sections.watchList.watchTable.commentHeader', {
        defaultMessage: 'Comment',
      })}{' '}
      <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
    </span>
  </EuiToolTip>
);

export const WatchListPage = () => {
  // hooks
  const {
    setBreadcrumbs,
    history,
    links: { watcherGettingStartedUrl },
  } = useAppContext();
  const [query, setQuery] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);

  const [selection, setSelection] = useState([]);
  const [watchesToDelete, setWatchesToDelete] = useState<string[]>([]);
  // Filter out deleted watches on the client, because the API will return 200 even though some watches
  // may not really be deleted until after they're done firing and this could take some time.
  const [deletedWatches, setDeletedWatches] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGINATION.initialPageSize,
  });

  useEffect(() => {
    setBreadcrumbs([listBreadcrumb]);
  }, [setBreadcrumbs]);

  const {
    isLoading: isWatchesLoading,
    data: watches,
    error,
  } = useLoadWatches(REFRESH_INTERVALS.WATCH_LIST);

  const [isPopoverOpen, setIsPopOverOpen] = useState<boolean>(false);

  const availableWatches = useMemo(
    () =>
      watches ? watches.filter((watch: any) => !deletedWatches.includes(watch.id)) : undefined,
    [watches, deletedWatches]
  );

  const watcherDescriptionText = (
    <FormattedMessage
      id="xpack.watcher.sections.watchList.subhead"
      defaultMessage="Watch for changes or anomalies in your data and take action if needed."
    />
  );

  const createWatchContextMenu = (
    <EuiPopover
      id="createWatchPanel"
      button={
        <EuiButton
          fill
          data-test-subj="createWatchButton"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsPopOverOpen(!isPopoverOpen)}
        >
          <FormattedMessage
            id="xpack.watcher.sections.watchList.createWatchButtonLabel"
            defaultMessage="Create"
          />
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopOverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenuPanel
        items={[WATCH_TYPES.THRESHOLD, WATCH_TYPES.JSON].map((watchType: string) => {
          return (
            <EuiContextMenuItem
              key={watchType}
              data-test-subj={`${watchType}WatchCreateLink`}
              onClick={() => {
                setIsPopOverOpen(false);
                const navigate =
                  watchType === WATCH_TYPES.THRESHOLD
                    ? goToCreateThresholdAlert
                    : goToCreateAdvancedWatch;
                navigate();
              }}
            >
              {watchType === WATCH_TYPES.THRESHOLD ? (
                <Fragment>
                  <EuiText size="m">
                    <span>
                      <FormattedMessage
                        id="xpack.watcher.sections.watchList.createThresholdAlertButtonLabel"
                        defaultMessage="Create threshold alert"
                      />
                    </span>
                  </EuiText>
                  <EuiText size="s" color="subdued">
                    <span>
                      <FormattedMessage
                        id="xpack.watcher.sections.watchList.createThresholdAlertButtonTooltip"
                        defaultMessage="Send an alert on a specified condition."
                      />
                    </span>
                  </EuiText>
                </Fragment>
              ) : (
                <Fragment>
                  <EuiText size="m">
                    <span>
                      <FormattedMessage
                        id="xpack.watcher.sections.watchList.createAdvancedWatchButtonLabel"
                        defaultMessage="Create advanced watch"
                      />
                    </span>
                  </EuiText>
                  <EuiText size="s" color="subdued">
                    <span>
                      <FormattedMessage
                        id="xpack.watcher.sections.watchList.createAdvancedWatchTooltip"
                        defaultMessage="Set up a custom watch in JSON."
                      />
                    </span>
                  </EuiText>
                </Fragment>
              )}
            </EuiContextMenuItem>
          );
        })}
      />
    </EuiPopover>
  );

  if (isWatchesLoading) {
    return (
      <EuiPageTemplate.EmptyPrompt>
        <SectionLoading>
          <FormattedMessage
            id="xpack.watcher.sections.watchList.loadingWatchesDescription"
            defaultMessage="Loading watches…"
          />
        </SectionLoading>
      </EuiPageTemplate.EmptyPrompt>
    );
  }

  const errorCode = getPageErrorCode(error);
  if (errorCode) {
    return <PageError errorCode={errorCode} />;
  } else if (error) {
    return (
      <GenericPageError
        title={
          <FormattedMessage
            id="xpack.watcher.sections.watchList.errorTitle"
            defaultMessage="Error loading watches"
          />
        }
        error={error as unknown as Error}
      />
    );
  }

  if (availableWatches && availableWatches.length === 0) {
    const emptyPromptBody = (
      <EuiText color="subdued">
        <p>
          {watcherDescriptionText}{' '}
          <EuiLink href={watcherGettingStartedUrl} target="_blank">
            <FormattedMessage
              id="xpack.watcher.sections.watchList.watcherLearnMoreLinkText"
              defaultMessage="Learn more."
            />
          </EuiLink>
        </p>
      </EuiText>
    );

    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="managementApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.watcher.sections.watchList.emptyPromptTitle"
              defaultMessage="You don’t have any watches yet"
            />
          </h1>
        }
        body={emptyPromptBody}
        actions={createWatchContextMenu}
        data-test-subj="emptyPrompt"
      />
    );
  }

  let content;

  if (availableWatches) {
    const columns = [
      {
        field: 'id',
        name: i18n.translate('xpack.watcher.sections.watchList.watchTable.idHeader', {
          defaultMessage: 'ID',
        }),
        sortable: true,
        truncateText: false,
        render: (id: string) => {
          return (
            <EuiLink
              data-test-subj={`watchIdColumn-${id}`}
              {...reactRouterNavigate(history, `/watches/watch/${id}/status`)}
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
        truncateText: false,
      },
      {
        field: 'watchStatus.state',
        name: stateColumnHeader,
        sortable: true,
        width: '130px',
        render: (state: string) => <WatchStateBadge state={state} />,
      },
      {
        field: 'watchStatus.lastMetCondition',
        name: conditionLastMetHeader,
        sortable: true,
        truncateText: true,
        width: '160px',
        render: (lastMetCondition: Moment) => {
          return lastMetCondition ? lastMetCondition.fromNow() : lastMetCondition;
        },
      },
      {
        field: 'watchStatus.lastChecked',
        name: lastCheckedHeader,
        sortable: true,
        truncateText: true,
        width: '160px',
        render: (lastChecked: Moment) => {
          return lastChecked ? lastChecked.fromNow() : lastChecked;
        },
      },
      {
        field: 'watchStatus.comment',
        name: commentHeader,
        sortable: true,
        truncateText: true,
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
                        defaultMessage: "Edit watch ''{name}''",
                        values: { name: watch.name },
                      }
                    )}
                    iconType="pencil"
                    color="primary"
                    {...reactRouterNavigate(history, `/watches/watch/${watch.id}/edit`)}
                    data-test-subj="editWatchButton"
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
                        defaultMessage: "Delete watch ''{name}''",
                        values: { name: watch.name },
                      }
                    )}
                    iconType="trash"
                    color="danger"
                    onClick={() => {
                      setWatchesToDelete([watch.id]);
                    }}
                    data-test-subj="deleteWatchButton"
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
          : '',
    };

    const handleOnChange = ({ queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
      if (!searchError) {
        setQuery(queryText);
        setQueryError(null);
      } else {
        setQueryError(searchError.message);
      }
    };

    const searchConfig = {
      onChange: handleOnChange,
      query,
      box: {
        incremental: true,
      },
      toolsLeft:
        selection.length > 0 ? (
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
        ) : undefined,
      toolsRight: createWatchContextMenu,
    };

    content = (
      <div data-test-subj="watchesTableContainer">
        <EuiInMemoryTable
          onTableChange={({ page: { index, size } }: CriteriaWithPagination<never>) =>
            setPagination({ pageIndex: index, pageSize: size })
          }
          items={availableWatches}
          itemId="id"
          columns={columns}
          search={searchConfig}
          pagination={{
            ...PAGINATION,
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }}
          sorting={{
            sort: {
              field: 'name',
              direction: 'asc',
            },
          }}
          selection={selectionConfig}
          childrenBetween={
            queryError && (
              <>
                <EuiCallOut
                  data-test-subj="watcherListSearchError"
                  iconType="warning"
                  color="danger"
                  title={
                    <FormattedMessage
                      id="xpack.watcher.sections.watchList.watchTable.errorOnSearch"
                      defaultMessage="Invalid search: {queryError}"
                      values={{ queryError }}
                    />
                  }
                />
                <EuiSpacer />
              </>
            )
          }
          message={
            <FormattedMessage
              id="xpack.watcher.sections.watchList.watchTable.noWatchesMessage"
              defaultMessage="No watches to show"
            />
          }
          rowProps={() => ({
            'data-test-subj': 'row',
          })}
          cellProps={() => ({
            'data-test-subj': 'cell',
          })}
          data-test-subj="watchesTable"
        />
      </div>
    );
  }

  return (
    <>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.watcher.sections.watchList.header"
              defaultMessage="Watcher"
            />
          </span>
        }
        bottomBorder
        rightSideItems={[
          <EuiButtonEmpty
            href={watcherGettingStartedUrl}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.watcher.sections.watchList.watcherGettingStartedDocsLinkText"
              defaultMessage="Watcher docs"
            />
          </EuiButtonEmpty>,
        ]}
        description={watcherDescriptionText}
      />
      <DeleteWatchesModal
        callback={(deleted?: string[]) => {
          if (deleted) {
            setDeletedWatches([...deletedWatches, ...watchesToDelete]);
          }
          setWatchesToDelete([]);
        }}
        watchesToDelete={watchesToDelete}
      />

      <EuiSpacer size="l" />

      {content}
    </>
  );
};
