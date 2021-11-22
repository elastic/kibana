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
  EuiCodeEditor,
  EuiAccordion,
  EuiPanel,
  EuiCheckbox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { EuiFieldText, EuiSelect } from '@elastic/eui';
import { ExpressionsStart } from 'src/plugins/expressions/public';
import { buildExpressionFunction } from '../../../../../src/plugins/expressions/public';
import { DatasourceDataPanelProps, DataType, StateSetter } from '../types';
import { IndexPattern, EsSQLPrivateState, IndexPatternField, IndexPatternRef } from './types';
import { esRawResponse } from '../../../../../src/plugins/data/common';
import { ChangeIndexPattern } from './change_indexpattern';
import { FieldButton } from '@kbn/react-field/field_button';
import { DragDrop, DragDropIdentifier } from '../drag_drop';
import { LensFieldIcon } from '../indexpattern_datasource/lens_field_icon';
import { ChildDragDropProvider, DragContextState } from '../drag_drop';

export type Props = DatasourceDataPanelProps<EsSQLPrivateState> & {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
};
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { flatten } from './flatten';

export function EsSQLDataPanel({
  setState,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
  expressions,
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
          {Object.entries(layers).map(([id, layer]) => {
            const ref = state.indexPatternRefs.find((r) => r.id === layer.index);
            return (
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
                    <div>
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
                        </EuiPanel>
                      </EuiFlexItem>
                    </div>
                  </EuiAccordion>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
          {state !== localState && (
            <EuiFlexItem>
              <EuiButton
                onClick={async () => {
                  try {
                    const responses = await Promise.all(
                      Object.entries(localState.layers).map(([id, layer]) => {
                        const ast = {
                          type: 'expression',
                          chain: [
                            buildExpressionFunction<any>('essql', {
                              query: layer.query,
                            }).toAst(),
                          ],
                        };
                        return expressions.run(ast, null).toPromise();
                      })
                    );
                    const cachedFieldList: Record<
                      string,
                      { fields: Array<{ name: string; type: string }>; singleRow: boolean }
                    > = {};
                    responses.forEach((response, index) => {
                      const layerId = Object.keys(localState.layers)[index];
                      // @ts-expect-error this is hacky, should probably run expression instead
                      const { rows, columns } = response.result;
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

export function EsSQLHorizontalDataPanel({
  setState,
  setStateAndForceApply,
  state,
  dragDropContext,
  core,
  data,
  query,
  filters,
  dateRange,
  expressions,
}: Props) {
  const [autoMap, setAutoMap] = useState(false);
  const [localState, setLocalState] = useState(state);

  useEffect(() => {
    setLocalState(state);
  }, [state]);

  const { layers, removedLayers } = localState;

  const onSubmit = async () => {
    try {
      const responses = await Promise.all(
        Object.entries(localState.layers).map(([id, layer]) => {
          const ast = {
            type: 'expression',
            chain: [
              buildExpressionFunction<any>('essql', {
                query: layer.query,
              }).toAst(),
            ],
          };
          return expressions.run(ast, null).toPromise();
        })
      );
      const cachedFieldList: Record<
        string,
        { fields: Array<{ name: string; type: string }>; singleRow: boolean }
      > = {};
      responses.forEach((response, index) => {
        const layerId = Object.keys(localState.layers)[index];
        // @ts-expect-error this is hacky, should probably run expression instead
        const { rows, columns } = response.result;
        // todo hack some logic in for dates
        cachedFieldList[layerId] = {
          fields: columns,
          singleRow: rows.length === 1,
        };
      });
      if (autoMap) {
        setStateAndForceApply({
          ...localState,
          cachedFieldList,
        });
      } else {
        setState({
          ...localState,
          cachedFieldList,
        });
      }
    } catch (e) {
      core.notifications.toasts.addError(e, {
        title: 'Request failed',
        toastMessage: e.body?.message,
      });
    }
  };

  return (
    <KibanaContextProvider
      services={{
        appName: 'lens',
        ...core,
      }}
    >
      <EuiSpacer size="xxl" />
      <EuiFlexGroup direction="column">
        {Object.entries(layers).map(([id, layer]) => {
          const ref = state.indexPatternRefs.find((r) => r.id === layer.index);
          return (
            <EuiFlexItem key={id}>
              <EuiPanel>
                <div
                  onKeyDown={(event) => {
                    if ((event.keyCode == 13 || event.which == 13) && event.metaKey) {
                      onSubmit();
                    }
                  }}
                >
                  <EuiCodeEditor
                    mode="sql"
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
                </div>
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
              <EuiCheckbox
                id={'myId'}
                label="Auto map columns"
                checked={autoMap}
                onChange={(e) => {
                  setAutoMap(!autoMap);
                  setLocalState({ ...localState, autoMap: !autoMap });
                  setState({ ...localState, autoMap: !autoMap });
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton disabled={state === localState} onClick={onSubmit}>
                Apply changes
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaContextProvider>
  );
}
