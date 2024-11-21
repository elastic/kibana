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
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { StreamDefinition } from '@kbn/streams-plugin/common';
import React, { useMemo } from 'react';
import { StreamChild } from '@kbn/streams-plugin/common/types';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { StreamsAppSearchBar } from '../streams_app_search_bar';
import { ConditionEditor } from '../condition_editor';
import { conditionToESQL } from '../../util/condition_to_esql';

export function StreamDetailRouting({ definition }: { definition?: StreamDefinition }) {
  const {
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

  const indexPatterns = useMemo(() => {
    if (!definition?.id) {
      return undefined;
    }

    const isRoot = definition.id.indexOf('.') === -1;

    const dataStreamOfDefinition = definition.id;

    return isRoot
      ? [dataStreamOfDefinition, `${dataStreamOfDefinition}.*`]
      : [`${dataStreamOfDefinition}*`];
  }, [definition?.id]);

  const [childUnderEdit, setChildUnderEdit] = React.useState<
    { isNew: boolean; child: StreamChild } | undefined
  >();

  const query = useMemo(() => {
    if (!indexPatterns || !childUnderEdit) {
      return undefined;
    }

    return `FROM ${indexPatterns.join(', ')} | WHERE ${conditionToESQL(
      childUnderEdit?.child.condition
    )}`;
  }, [childUnderEdit, indexPatterns]);

  const previewSampleFetch = useStreamsAppFetch(
    async ({ signal }) => {
      if (!query || !indexPatterns) {
        return undefined;
      }

      const existingIndices = await dataViews.getExistingIndices(indexPatterns);

      if (existingIndices.length === 0) {
        return undefined;
      }

      return streamsRepositoryClient.fetch('POST /internal/streams/esql', {
        params: {
          body: {
            operationName: 'get_sample',
            query,
            start,
            end,
          },
        },
        signal,
      });
    },
    [query, indexPatterns, dataViews, streamsRepositoryClient, start, end]
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
                        <>
                          <EuiText>
                            {i18n.translate('xpack.streams.streamDetail.preview.count', {
                              defaultMessage: 'Preview count: {count}',
                              values: {
                                count: previewSampleFetch.value?.values.length,
                              },
                            })}
                          </EuiText>
                          {previewSampleFetch.value?.values.map((value, i) => (
                            <EuiText key={i}>{JSON.stringify(value)}</EuiText>
                          ))}
                        </>
                      )}
                    </EuiResizablePanel>
                  </>
                )}
              </EuiResizableContainer>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        {childUnderEdit && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="flexEnd">
              {childUnderEdit.isNew ? (
                <EuiButton data-test-subj="streamsAppStreamDetailRoutingSaveButton">
                  {i18n.translate('xpack.streams.streamDetailRouting.add', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              ) : (
                <EuiButton data-test-subj="streamsAppStreamDetailRoutingChangeStreamButton">
                  {i18n.translate('xpack.streams.streamDetailRouting.change', {
                    defaultMessage: 'Change routing',
                  })}
                </EuiButton>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

function CurrentStreamEntry({ definition }: { definition: StreamDefinition }) {
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
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonEmpty
            size="s"
            data-test-subj="streamsAppRoutingStreamEntryRemoveButton"
            onClick={() => {
              onChildChange(undefined);
            }}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.remove', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
