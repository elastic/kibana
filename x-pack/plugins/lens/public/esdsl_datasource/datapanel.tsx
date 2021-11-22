/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, indexBy } from 'lodash';
import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  // @ts-ignore
  EuiHighlight,
  EuiFlexGroup,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiContextMenuPanelProps,
  EuiPopover,
  EuiPopoverTitle,
  EuiPopoverFooter,
  EuiCallOut,
  EuiFormControlLayout,
  EuiSwitch,
  EuiFacetButton,
  EuiIcon,
  EuiSpacer,
  EuiFormLabel,
  EuiButton,
  EuiAccordion,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { EuiFieldText, EuiSelect } from '@elastic/eui';
import { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { IndexPattern, EsDSLPrivateState, IndexPatternField, IndexPatternRef } from './types';
import { esRawResponse } from '../../../../../src/plugins/data/common';
import { ChangeIndexPattern } from './change_indexpattern';
import { FieldButton } from '@kbn/react-field/field_button';
import { DragDrop, DragDropIdentifier } from '../drag_drop';
import { LensFieldIcon } from '../indexpattern_datasource/lens_field_icon';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';
import { CodeEditor } from '../../../../../src/plugins/kibana_react/public';

export type Props = DatasourceDataPanelProps<EsDSLPrivateState> & {
  data: DataPublicPluginStart;
};
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { flatten } from './flatten';

export function EsDSLDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
}: Props) {
  const [localState, setLocalState] = useState(state);

  useEffect(() => {
    setLocalState(state);
  }, [state]);
  const [openPopover, setOpenPopover] = useState('');

  const { layers, removedLayers } = localState;

  return (
    <KibanaContextProvider
      services={{
        appName: 'lens',
        ...core,
      }}
    >
      <ChildDragDropProvider {...dragDropContext}>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column">
          {Object.entries(layers).map(([id, layer]) => (
            <EuiFlexItem key={id}>
              <EuiPanel>
                <ul className="lnsInnerIndexPatternDataPanel__fieldItems">
                  {localState.cachedFieldList[id]?.fields.length > 0 &&
                    localState.cachedFieldList[id].fields.map((field, index) => (
                      <li key={field?.name}>
                        <EuiPopover
                          ownFocus
                          className="lnsFieldItem__popoverAnchor"
                          display="block"
                          data-test-subj="lnsFieldListPanelField"
                          button={
                            <DragDrop
                              draggable
                              order={[index]}
                              value={{
                                isSqlField: true,
                                field: field?.name,
                                humanData: { label: field?.name },
                              }}
                              dataTestSubj={`lnsFieldListPanelField-${field.name}`}
                            >
                              <FieldButton
                                className={`lnsFieldItem lnsFieldItem--${field?.meta?.type}`}
                                isActive={openPopover === field.name}
                                onClick={() => {
                                  if (openPopover === field.name) {
                                    setOpenPopover('');
                                  } else {
                                    setOpenPopover(field.name);
                                  }
                                }}
                                buttonProps={{
                                  ['aria-label']: i18n.translate(
                                    'xpack.lens.indexPattern.fieldStatsButtonAriaLabel',
                                    {
                                      defaultMessage: 'Preview {fieldName}: {fieldType}',
                                      values: {
                                        fieldName: field?.name,
                                        fieldType: field?.meta.type,
                                      },
                                    }
                                  ),
                                }}
                                fieldIcon={<LensFieldIcon type={field?.meta.type as DataType} />}
                                fieldName={field?.name}
                              />
                            </DragDrop>
                          }
                          isOpen={openPopover === field.name}
                          closePopover={() => setOpenPopover('')}
                          anchorPosition="rightUp"
                          panelClassName="lnsFieldItem__fieldPanel"
                          initialFocus=".lnsFieldItem__fieldPanel"
                        >
                          <EuiSelect
                            value={layer.overwrittenFieldTypes?.[field.name] || field?.meta?.type}
                            options={[
                              { value: 'number', text: 'number' },
                              { value: 'boolean', text: 'boolean' },
                              { value: 'string', text: 'string' },
                              { value: 'date', text: 'date' },
                            ]}
                            onChange={(e) => {
                              setLocalState({
                                ...state,
                                layers: {
                                  ...state.layers,
                                  [id]: {
                                    ...layer,
                                    overwrittenFieldTypes: {
                                      ...(layer.overwrittenFieldTypes || {}),
                                      [field.name]: e.target.value,
                                    },
                                  },
                                },
                              });
                            }}
                          />
                        </EuiPopover>
                      </li>
                    ))}
                </ul>
                <EuiAccordion id={id + 'settings'} buttonContent="Advanced settings">
                  <EuiFieldText
                    value={layer.timeField}
                    placeholder="Timefield (bound to filter)"
                    onChange={(e) => {
                      setLocalState({
                        ...state,
                        layers: {
                          ...state.layers,
                          [id]: {
                            ...layer,
                            timeField: e.target.value,
                          },
                        },
                      });
                    }}
                  />
                </EuiAccordion>
              </EuiPanel>
            </EuiFlexItem>
          ))}
          {state !== localState && (
            <EuiFlexItem>
              <EuiButton
                onClick={async () => {
                  try {
                    const responses = await Promise.all(
                      Object.entries(localState.layers).map(([id, layer]) => {
                        return data.search
                          .search({
                            params: {
                              size: 0,
                              index: layer.index,
                              body: JSON.parse(layer.query),
                            },
                          })
                          .toPromise();
                      })
                    );
                    const cachedFieldList: Record<
                      string,
                      { fields: Array<{ name: string; type: string }>; singleRow: boolean }
                    > = {};
                    responses.forEach((response, index) => {
                      const layerId = Object.keys(localState.layers)[index];
                      // @ts-expect-error this is hacky, should probably run expression instead
                      const { rows, columns } = esRawResponse.to!.datatable({
                        body: response.rawResponse,
                      });
                      // todo hack some logic in for dates
                      cachedFieldList[layerId] = { fields: columns, singleRow: rows.length === 1 };
                    });
                    setState({
                      ...localState,
                      cachedFieldList,
                    });
                  } catch (e) {
                    core.notifications.toasts.addError(e, {
                      title: 'Request failed',
                      toastMessage: e.body?.message,
                    });
                  }
                }}
              >
                Apply changes
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </ChildDragDropProvider>
    </KibanaContextProvider>
  );
}

export function EsDSLHorizontalDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
}: Props) {
  const [localState, setLocalState] = useState(state);

  useEffect(() => {
    setLocalState(state);
  }, [state]);

  const { layers, removedLayers } = localState;

  return (
    <KibanaContextProvider
      services={{
        appName: 'lens',
        ...core,
      }}
    >
      <ChildDragDropProvider {...dragDropContext}>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup direction="column">
          {Object.entries(layers).map(([id, layer]) => {
            const ref = state.indexPatternRefs.find((r) => r.id === layer.index);
            return (
              <EuiFlexItem key={id}>
                <EuiPanel>
                  <ChangeIndexPattern
                    data-test-subj="indexPattern-switcher"
                    trigger={{
                      label: ref?.title,
                      title: ref?.title,
                      'data-test-subj': 'indexPattern-switch-link',
                      fontWeight: 'bold',
                    }}
                    indexPatternId={layer.index}
                    indexPatternRefs={state.indexPatternRefs}
                    onChangeIndexPattern={(newId: string) => {
                      setState({
                        ...state,
                        layers: {
                          ...state.layers,
                          [id]: {
                            ...layer,
                            index: newId,
                          },
                        },
                      });
                    }}
                  />
                  <CodeEditor
                    mode="json"
                    theme="github"
                    value={layer.query}
                    width="100%"
                    height="250px"
                    onChange={(val) => {
                      setLocalState({
                        ...state,
                        layers: {
                          ...state.layers,
                          [id]: {
                            ...layer,
                            query: val,
                          },
                        },
                      });
                    }}
                  />
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
          {Object.entries(removedLayers).map(([id, { layer }]) => (
            <EuiFlexItem key={id}>
              <EuiPanel>
                Currently detached. Add new layers to your visualization to use.
                <EuiFieldText value={layer.index} readOnly />
                <EuiCodeEditor
                  mode="json"
                  theme="github"
                  value={layer.query}
                  width="100%"
                  height="250px"
                  readOnly
                />
              </EuiPanel>
            </EuiFlexItem>
          ))}
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiFlexItem>
                  <EuiButton
                    disabled={state === localState}
                    onClick={async () => {
                      try {
                        const responses = await Promise.all(
                          Object.entries(localState.layers).map(([id, layer]) => {
                            return data.search
                              .search({
                                params: {
                                  size: 0,
                                  index: [
                                    state.indexPatternRefs.find((r) => r.id === layer.index)!.title,
                                  ],
                                  body: JSON.parse(layer.query),
                                },
                              })
                              .toPromise();
                          })
                        );
                        const cachedFieldList: Record<
                          string,
                          { fields: Array<{ name: string; type: string }>; singleRow: boolean }
                        > = {};
                        responses.forEach((response, index) => {
                          const layerId = Object.keys(localState.layers)[index];
                          // @ts-expect-error this is hacky, should probably run expression instead
                          const { rows, columns } = esRawResponse.to!.datatable({
                            body: response.rawResponse,
                          });
                          columns.forEach((col) => {
                            const testVal = rows[0][col.id];
                            if (typeof testVal === 'number' && Math.log10(testVal) > 11) {
                              // col.meta.type = 'date';
                              // col.meta.params = { id: 'date' };
                              localState.layers[layerId].overwrittenFieldTypes = {
                                ...(localState.layers[layerId].overwrittenFieldTypes || {}),
                                [col.id]: 'date',
                              };
                            }
                          });
                          // todo hack some logic in for dates
                          cachedFieldList[layerId] = {
                            fields: columns,
                            singleRow: rows.length === 1,
                          };
                        });
                        setState({
                          ...localState,
                          cachedFieldList,
                        });
                      } catch (e) {
                        core.notifications.toasts.addError(e, {
                          title: 'Request failed',
                          toastMessage: e.body?.message,
                        });
                      }
                    }}
                  >
                    Apply changes
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChildDragDropProvider>
    </KibanaContextProvider>
  );
}
