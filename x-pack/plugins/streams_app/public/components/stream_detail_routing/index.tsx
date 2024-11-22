/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDataGrid,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiResizableContainer,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { ReadStreamDefinition } from '@kbn/streams-plugin/common';
import React, { useMemo } from 'react';
import { StreamChild } from '@kbn/streams-plugin/common/types';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { ConditionEditor } from '../condition_editor';
import { useDebounced } from '../../util/use_debounce';

export function StreamDetailRouting({
  definition,
  refreshDefinition,
}: {
  definition?: ReadStreamDefinition;
  refreshDefinition: () => void;
}) {
  const {
    core: { notifications },
    dependencies: {
      start: {
        data,
        dataViews,
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const {
    timeRange,
    absoluteTimeRange: { start, end },
    setTimeRange,
  } = useDateRange({ data });

  const dataStream = definition?.id;

  const [childUnderEdit, setChildUnderEdit] = React.useState<
    { isNew: boolean; child: StreamChild } | undefined
  >();

  const debouncedChildUnderEdit = useDebounced(childUnderEdit, 300);

  const updateAbortController = useAbortController();

  const previewSampleFetch = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition || !debouncedChildUnderEdit || !debouncedChildUnderEdit.isNew) {
        return Promise.resolve({ documents: [] });
      }
      return streamsRepositoryClient.fetch('POST /api/streams/{id}/_sample', {
        signal,
        params: {
          path: {
            id: definition.id,
          },
          body: {
            condition: debouncedChildUnderEdit.child.condition,
            start: start?.valueOf(),
            end: end?.valueOf(),
            number: 100,
          },
        },
      });
    },
    [definition, debouncedChildUnderEdit, streamsRepositoryClient, start, end]
  );

  const dataViewsFetch = useAbortableAsync(() => {
    return dataViews
      .create(
        {
          title: dataStream,
          timeFieldName: '@timestamp',
        },
        false, // skip fetch fields
        true // display errors
      )
      .then((response) => {
        return [response];
      });
  }, [dataViews, dataStream]);

  const fetchedDataViews = useMemo(() => dataViewsFetch.value ?? [], [dataViewsFetch.value]);

  if (!definition) {
    return null;
  }

  return (
    <EuiFlexItem grow>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <StreamsAppSearchBar
            onQuerySubmit={({ dateRange }, isUpdate) => {
              if (!isUpdate) {
                previewSampleFetch.refresh();
                return;
              }

              if (dateRange) {
                setTimeRange({ from: dateRange.from, to: dateRange?.to, mode: dateRange.mode });
              }
            }}
            onRefresh={() => {
              previewSampleFetch.refresh();
            }}
            dataViews={fetchedDataViews}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiPanel
            hasShadow={false}
            hasBorder
            className={css`
              display: flex;
            `}
            paddingSize="xs"
          >
            <EuiFlexGroup direction="row">
              <EuiResizableContainer>
                {(EuiResizablePanel, EuiResizableButton) => (
                  <>
                    <EuiResizablePanel initialSize={50} minSize="30%" tabIndex={0} paddingSize="xs">
                      <EuiText>
                        <div>
                          {i18n.translate('xpack.streams.streamDetailRouting.rules.header', {
                            defaultMessage: 'Routing rules',
                          })}
                        </div>
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiFlexGroup direction="column" gutterSize="xs">
                        <CurrentStreamEntry definition={definition} />
                        {definition.children.map((child) => (
                          <RoutingStreamEntry
                            key={child.id}
                            child={
                              child.id === childUnderEdit?.child.id ? childUnderEdit.child : child
                            }
                            edit={child.id === childUnderEdit?.child.id}
                            onEditStateChange={() => {
                              if (child.id === childUnderEdit?.child.id) {
                                setChildUnderEdit(undefined);
                              } else {
                                setChildUnderEdit({ isNew: false, child });
                              }
                            }}
                            onChildChange={(newChild) => {
                              setChildUnderEdit({ isNew: false, child: newChild });
                            }}
                          />
                        ))}
                        {childUnderEdit?.isNew && (
                          <NewRoutingStreamEntry
                            child={childUnderEdit.child}
                            onChildChange={(newChild) => {
                              if (!newChild) {
                                setChildUnderEdit(undefined);
                                return;
                              }
                              setChildUnderEdit({ isNew: true, child: newChild });
                            }}
                          />
                        )}
                        <EuiButtonEmpty
                          data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                          disabled={childUnderEdit?.isNew}
                          onClick={() => {
                            setChildUnderEdit({
                              isNew: true,
                              child: {
                                id: `${definition.id}.child`,
                                condition: {
                                  field: '',
                                  operator: 'eq',
                                  value: '',
                                },
                              },
                            });
                          }}
                        >
                          {i18n.translate('xpack.streams.streamDetailRouting.addRule', {
                            defaultMessage: 'Create a new child stream',
                          })}
                        </EuiButtonEmpty>
                      </EuiFlexGroup>
                    </EuiResizablePanel>

                    <EuiResizableButton accountForScrollbars="before" />

                    <EuiResizablePanel
                      initialSize={50}
                      minSize="200px"
                      tabIndex={0}
                      paddingSize="xs"
                      className={css`
                        display: flex;
                        flex-direction: column;
                      `}
                    >
                      <EuiText>
                        <div>
                          {i18n.translate('xpack.streams.streamDetail.preview.header', {
                            defaultMessage: 'Preview',
                          })}
                        </div>
                      </EuiText>
                      {previewSampleFetch.loading && <EuiLoadingSpinner size="m" />}
                      {previewSampleFetch.error && (
                        <EuiText color="danger">
                          {i18n.translate('xpack.streams.streamDetail.preview.error', {
                            defaultMessage: 'Error loading preview',
                          })}
                        </EuiText>
                      )}
                      {previewSampleFetch.value && (
                        <EuiFlexItem grow>
                          <PreviewTable documents={previewSampleFetch.value?.documents ?? []} />
                        </EuiFlexItem>
                      )}
                    </EuiResizablePanel>
                  </>
                )}
              </EuiResizableContainer>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {childUnderEdit && (
          <EuiBottomBar paddingSize="s">
            <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
              <EuiButtonEmpty
                size="s"
                data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
                onClick={() => {
                  setChildUnderEdit(undefined);
                }}
              >
                {i18n.translate('xpack.streams.streamDetailRouting.remove', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>
              {childUnderEdit.isNew ? (
                <EuiButton
                  onClick={async () => {
                    try {
                      await streamsRepositoryClient.fetch('POST /api/streams/{id}/_fork', {
                        signal: updateAbortController.signal,
                        params: {
                          path: {
                            id: definition.id,
                          },
                          body: {
                            condition: childUnderEdit.child.condition,
                            stream: {
                              id: childUnderEdit.child.id,
                              processing: [],
                              fields: [],
                            },
                          },
                        },
                      });
                      notifications.toasts.addSuccess({
                        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
                          defaultMessage: 'Stream saved',
                        }),
                      });
                      setChildUnderEdit(undefined);
                      refreshDefinition();
                    } catch (error) {
                      notifications.toasts.addError(error, {
                        title: i18n.translate('xpack.streams.failedToSave', {
                          defaultMessage: 'Failed to create sub stream for {id}',
                          values: {
                            id: definition.id,
                          },
                        }),
                      });
                    }
                  }}
                  data-test-subj="streamsAppStreamDetailRoutingSaveButton"
                >
                  {i18n.translate('xpack.streams.streamDetailRouting.add', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              ) : (
                <EuiButton
                  onClick={async () => {
                    try {
                      const { inheritedFields, id, ...definitionToUpdate } = definition;
                      await streamsRepositoryClient.fetch('PUT /api/streams/{id}', {
                        signal: updateAbortController.signal,
                        params: {
                          path: {
                            id: definition.id,
                          },
                          body: {
                            ...definitionToUpdate,
                            children: definition.children.map((child) =>
                              child.id === childUnderEdit.child.id ? childUnderEdit.child : child
                            ),
                          },
                        },
                      });
                      notifications.toasts.addSuccess({
                        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
                          defaultMessage: 'Stream saved',
                        }),
                      });
                      setChildUnderEdit(undefined);
                      refreshDefinition();
                    } catch (error) {
                      notifications.toasts.addError(error, {
                        title: i18n.translate('xpack.streams.failedToSave', {
                          defaultMessage: 'Failed to update stream {id}',
                          values: {
                            id: definition.id,
                          },
                        }),
                      });
                    }
                  }}
                  data-test-subj="streamsAppStreamDetailRoutingChangeStreamButton"
                >
                  {i18n.translate('xpack.streams.streamDetailRouting.change', {
                    defaultMessage: 'Change routing',
                  })}
                </EuiButton>
              )}
            </EuiFlexGroup>
          </EuiBottomBar>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function PreviewTable({ documents }: { documents: unknown[] }) {
  // grid columns are all the keys that have at least one change
  const columns = useMemo(() => {
    const cols = new Set<string>();
    documents.forEach((doc) => {
      if (!doc || typeof doc !== 'object') {
        return;
      }
      Object.keys(doc).forEach((key) => {
        cols.add(key);
      });
    });
    return Array.from(cols);
  }, [documents]);

  const gridColumns = useMemo(() => {
    return Array.from(columns).map((column) => ({
      id: column,
      displayAsText: column,
    }));
  }, [columns]);

  return (
    <EuiDataGrid
      aria-label={i18n.translate('xpack.streams.resultPanel.euiDataGrid.previewLabel', {
        defaultMessage: 'Preview',
      })}
      columns={gridColumns}
      columnVisibility={{ visibleColumns: columns, setVisibleColumns: () => {} }}
      rowCount={documents.length}
      height="100%"
      renderCellValue={({ rowIndex, columnId }) => {
        const doc = documents[rowIndex];
        if (!doc || typeof doc !== 'object') {
          return '';
        }
        const value = (doc as Record<string, unknown>)[columnId];
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
      }}
    />
  );
}

function CurrentStreamEntry({ definition }: { definition: ReadStreamDefinition }) {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiText size="s">{definition.id}</EuiText>
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.streamDetailRouting.currentStream', {
          defaultMessage: 'Current stream',
        })}
      </EuiText>
    </EuiPanel>
  );
}

function RoutingStreamEntry({
  child,
  onChildChange,
  onEditStateChange,
  edit,
}: {
  child: StreamChild;
  onChildChange: (child: StreamChild) => void;
  onEditStateChange: () => void;
  edit?: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiIcon
          type={isExpanded ? 'minimize' : 'expand'}
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (edit) {
              onEditStateChange();
            }
          }}
        />
        <EuiFlexItem grow>
          <EuiText size="s">{child.id}</EuiText>
        </EuiFlexItem>
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="pencil"
          onClick={() => {
            onEditStateChange();
            setIsExpanded(true);
          }}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
        />
      </EuiFlexGroup>
      {isExpanded && child.condition && (
        <ConditionEditor
          readonly={!edit}
          condition={child.condition}
          onConditionChange={(condition) => {
            onChildChange({
              ...child,
              condition,
            });
          }}
        />
      )}
      {isExpanded && !child.condition && (
        <EuiText>
          {i18n.translate('xpack.streams.streamDetailRouting.noCondition', {
            defaultMessage: 'No condition, no documents will be routed',
          })}
        </EuiText>
      )}
    </EuiPanel>
  );
}

function NewRoutingStreamEntry({
  child,
  onChildChange,
}: {
  child: StreamChild;
  onChildChange: (child?: StreamChild) => void;
}) {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="xs" direction="column">
        <EuiFormRow
          label={i18n.translate('xpack.streams.streamDetailRouting.name', {
            defaultMessage: 'Stream name',
          })}
        >
          <EuiFieldText
            data-test-subj="streamsAppRoutingStreamEntryNameField"
            value={child.id}
            onChange={(e) => {
              onChildChange({
                ...child,
                id: e.target.value,
              });
            }}
          />
        </EuiFormRow>
        {child.condition && (
          <ConditionEditor
            readonly={false}
            condition={child.condition}
            onConditionChange={(condition) => {
              onChildChange({
                ...child,
                condition,
              });
            }}
          />
        )}
        {!child.condition && (
          <EuiText>
            {i18n.translate('xpack.streams.streamDetailRouting.noCondition', {
              defaultMessage: 'No condition, no documents will be routed',
            })}
          </EuiText>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
}
