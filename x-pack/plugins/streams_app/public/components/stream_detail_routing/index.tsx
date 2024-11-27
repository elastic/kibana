/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDataGrid,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiImage,
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
import React, { useEffect, useMemo, useState } from 'react';
import { StreamChild } from '@kbn/streams-plugin/common/types';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { ConditionEditor } from '../condition_editor';
import { useDebounced } from '../../util/use_debounce';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { NestedView } from '../nested_view';
import illustration from './assets/illustration.png';

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
  const [saveInProgress, setSaveInProgress] = React.useState(false);

  if (!definition) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      className={css`
        overflow: auto;
      `}
    >
      <EuiFlexItem
        grow
        className={css`
          overflow: auto;
        `}
      >
        <EuiPanel
          hasShadow={false}
          hasBorder
          className={css`
            display: flex;
            max-width: 100%;
            overflow: auto;
          `}
          paddingSize="xs"
        >
          <EuiFlexGroup
            direction="row"
            className={css`
              max-width: 100%;
              overflow: auto;
            `}
          >
            <EuiResizableContainer>
              {(EuiResizablePanel, EuiResizableButton) => (
                <>
                  <EuiResizablePanel
                    initialSize={30}
                    minSize="300px"
                    tabIndex={0}
                    paddingSize="s"
                    className={css`
                      background-color: #f5f7fa;
                      overflow: auto;
                      display: flex;
                    `}
                  >
                    <EuiFlexGroup
                      direction="column"
                      gutterSize="s"
                      className={css`
                        overflow: auto;
                      `}
                    >
                      <EuiFlexItem grow={false}>
                        <EuiText
                          size="s"
                          className={css`
                            height: 40px;
                            align-content: center;
                          `}
                        >
                          {i18n.translate('xpack.streams.streamDetailRouting.rules.header', {
                            defaultMessage: 'Routing rules',
                          })}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexGroup
                        direction="column"
                        gutterSize="xs"
                        className={css`
                          overflow: auto;
                        `}
                      >
                        <CurrentStreamEntry definition={definition} />
                        {definition.children.map((child, i) => (
                          <NestedView key={i}>
                            <RoutingStreamEntry
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
                          </NestedView>
                        ))}
                        {childUnderEdit?.isNew ? (
                          <NestedView last>
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
                          </NestedView>
                        ) : (
                          <NestedView last>
                            <EuiPanel hasShadow={false} hasBorder paddingSize="none">
                              <EuiButtonEmpty
                                iconType="plus"
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
                            </EuiPanel>
                          </NestedView>
                        )}
                      </EuiFlexGroup>
                    </EuiFlexGroup>
                  </EuiResizablePanel>

                  <EuiResizableButton accountForScrollbars="both" />

                  <EuiResizablePanel
                    initialSize={70}
                    tabIndex={0}
                    minSize="300px"
                    paddingSize="s"
                    className={css`
                      display: flex;
                      flex-direction: column;
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup alignItems="center">
                        <EuiFlexItem grow>
                          <EuiText size="s">
                            <EuiFlexGroup gutterSize="s" alignItems="center">
                              <EuiIcon type="inspect" />
                              {i18n.translate('xpack.streams.streamDetail.preview.header', {
                                defaultMessage: 'Data Preview',
                              })}
                              {previewSampleFetch.loading && <EuiLoadingSpinner size="s" />}
                            </EuiFlexGroup>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <StreamsAppSearchBar
                            onQuerySubmit={({ dateRange }, isUpdate) => {
                              if (!isUpdate) {
                                previewSampleFetch.refresh();
                                return;
                              }

                              if (dateRange) {
                                setTimeRange({
                                  from: dateRange.from,
                                  to: dateRange?.to,
                                  mode: dateRange.mode,
                                });
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
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiSpacer size="s" />
                    {previewSampleFetch.error && (
                      <EuiText color="danger">
                        {i18n.translate('xpack.streams.streamDetail.preview.error', {
                          defaultMessage: 'Error loading preview',
                        })}
                      </EuiText>
                    )}
                    {previewSampleFetch.value?.documents &&
                    previewSampleFetch.value.documents.length ? (
                      <EuiFlexItem grow>
                        <PreviewTable documents={previewSampleFetch.value?.documents ?? []} />
                      </EuiFlexItem>
                    ) : (
                      <EuiFlexItem grow>
                        <EuiFlexGroup alignItems="center" justifyContent="center">
                          <EuiFlexItem
                            grow={false}
                            className={css`
                              max-width: 350px;
                            `}
                          >
                            <EuiImage
                              src={illustration}
                              alt="Illustration"
                              className={css`
                                width: 250px;
                              `}
                            />
                            {previewSampleFetch.loading ? (
                              <EuiText size="xs" textAlign="center">
                                <EuiLoadingSpinner size="m" />
                              </EuiText>
                            ) : (
                              <>
                                {debouncedChildUnderEdit && debouncedChildUnderEdit.isNew && (
                                  <EuiText size="xs" textAlign="center">
                                    {i18n.translate('xpack.streams.streamDetail.preview.empty', {
                                      defaultMessage: 'No documents to preview',
                                    })}
                                  </EuiText>
                                )}
                                {debouncedChildUnderEdit && !debouncedChildUnderEdit.isNew && (
                                  <>
                                    <EuiText size="m" textAlign="center">
                                      {i18n.translate(
                                        'xpack.streams.streamDetail.preview.editPreviewMessage',
                                        {
                                          defaultMessage:
                                            'Preview is not available while editing streams',
                                        }
                                      )}
                                    </EuiText>
                                    <EuiText size="xs" textAlign="center">
                                      {i18n.translate(
                                        'xpack.streams.streamDetail.preview.editPreviewMessageDescription',
                                        {
                                          defaultMessage:
                                            'You will find here the result from the conditions you have made once you save the changes',
                                        }
                                      )}
                                    </EuiText>
                                  </>
                                )}
                                {!debouncedChildUnderEdit && (
                                  <>
                                    <EuiText size="m" textAlign="center">
                                      {i18n.translate(
                                        'xpack.streams.streamDetail.preview.editPreviewMessageEmpty',
                                        {
                                          defaultMessage: 'Your preview will appear here',
                                        }
                                      )}
                                    </EuiText>
                                    <EuiText size="xs" textAlign="center">
                                      {i18n.translate(
                                        'xpack.streams.streamDetail.preview.editPreviewMessageEmptyDescription',
                                        {
                                          defaultMessage:
                                            'Select a stream to preview it’s data, here you will see the stream and all it’s children.',
                                        }
                                      )}
                                    </EuiText>
                                  </>
                                )}
                              </>
                            )}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    )}
                  </EuiResizablePanel>
                </>
              )}
            </EuiResizableContainer>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          {childUnderEdit ? (
            <>
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
                  isLoading={saveInProgress}
                  onClick={async () => {
                    try {
                      setSaveInProgress(true);
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
                      setSaveInProgress(false);
                      notifications.toasts.addSuccess({
                        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
                          defaultMessage: 'Stream saved',
                        }),
                      });
                      setChildUnderEdit(undefined);
                      refreshDefinition();
                    } catch (error) {
                      setSaveInProgress(false);
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
                      setSaveInProgress(true);
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
                      setSaveInProgress(false);
                      notifications.toasts.addSuccess({
                        title: i18n.translate('xpack.streams.streamDetailRouting.saved', {
                          defaultMessage: 'Stream saved',
                        }),
                      });
                      setChildUnderEdit(undefined);
                      refreshDefinition();
                    } catch (error) {
                      setSaveInProgress(false);
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
            </>
          ) : (
            <EuiButton disabled data-test-subj="streamsAppStreamDetailRoutingSaveButton">
              {i18n.translate('xpack.streams.streamDetailRouting.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function PreviewTable({ documents }: { documents: unknown[] }) {
  const [height, setHeight] = useState('100px');
  useEffect(() => {
    // set height to 100% after a short delay otherwise it doesn't calculate correctly
    // TODO: figure out a better way to do this
    setTimeout(() => {
      setHeight(`100%`);
    }, 50);
  }, []);
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
      columnVisibility={{
        visibleColumns: columns,
        setVisibleColumns: () => {},
        canDragAndDropColumns: false,
      }}
      toolbarVisibility={false}
      rowCount={documents.length}
      height={height}
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
    <EuiFlexItem grow={false}>
      <EuiPanel hasShadow={false} hasBorder paddingSize="s">
        <EuiText size="s">{definition.id}</EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.streamDetailRouting.currentStream', {
            defaultMessage: 'Current stream',
          })}
        </EuiText>
      </EuiPanel>
    </EuiFlexItem>
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
  const router = useStreamsAppRouter();
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow>
          <EuiText size="s">{child.id}</EuiText>
        </EuiFlexItem>
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="pencil"
          onClick={() => {
            onEditStateChange();
          }}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.edit', {
            defaultMessage: 'Edit',
          })}
        />
        <EuiButtonIcon
          data-test-subj="streamsAppRoutingStreamEntryButton"
          iconType="popout"
          href={router.link('/{key}/{tab}/{subtab}', {
            path: { key: child.id, tab: 'management', subtab: 'route' },
          })}
          aria-label={i18n.translate('xpack.streams.streamDetailRouting.goto', {
            defaultMessage: 'Go to stream',
          })}
        />
      </EuiFlexGroup>
      {child.condition && (
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
      {!child.condition && (
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
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.streams.streamDetailRouting.name', {
            defaultMessage: 'Stream name',
          })}
        >
          <EuiFieldText
            data-test-subj="streamsAppRoutingStreamEntryNameField"
            value={child.id}
            fullWidth
            compressed
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
