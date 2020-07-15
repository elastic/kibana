/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './popover_editor.scss';
import _ from 'lodash';
import React, { useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiListGroup,
  EuiCallOut,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiListGroupItemProps,
  EuiButton,
} from '@elastic/eui';
import classNames from 'classnames';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import { IndexPatternDimensionEditorProps, OperationFieldSupportMatrix } from './dimension_panel';
import {
  operationDefinitionMap,
  getOperationDisplay,
  buildColumn,
  changeField,
} from '../operations';
import { deleteColumn, changeColumn, updateColumnParam } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPattern, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { FormatSelector } from './format_selector';
import uuid from 'uuid';

const operationPanels = getOperationDisplay();

export interface PopoverEditorProps extends IndexPatternDimensionEditorProps {
  selectedColumn?: IndexPatternColumn;
  operationFieldSupportMatrix: OperationFieldSupportMatrix;
  currentIndexPattern: IndexPattern;
}

function asOperationOptions(operationTypes: OperationType[], compatibleWithCurrentField: boolean) {
  return [...operationTypes]
    .sort((opType1, opType2) => {
      return operationPanels[opType1].displayName.localeCompare(
        operationPanels[opType2].displayName
      );
    })
    .map((operationType) => ({
      operationType,
      compatibleWithCurrentField,
    }));
}

const LabelInput = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value, setInputValue]);

  const onChangeDebounced = useMemo(() => _.debounce(onChange, 256), [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = String(e.target.value);
    setInputValue(val);
    onChangeDebounced(val);
  };

  return (
    <EuiFieldText
      compressed
      data-test-subj="indexPattern-label-edit"
      value={inputValue}
      onChange={handleInputChange}
    />
  );
};

export function PopoverEditor(props: PopoverEditorProps) {
  const {
    selectedColumn,
    operationFieldSupportMatrix,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
    hideGrouping,
  } = props;
  const { operationByField, fieldByOperation } = operationFieldSupportMatrix;
  const [
    incompatibleSelectedOperationType,
    setInvalidOperationType,
  ] = useState<OperationType | null>(null);

  const ParamEditor =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType].paramEditor;

  const fieldMap: Record<string, IndexPatternField> = useMemo(() => {
    const fields: Record<string, IndexPatternField> = {};
    currentIndexPattern.fields.forEach((field) => {
      fields[field.name] = field;
    });
    return fields;
  }, [currentIndexPattern]);

  function getOperationTypes() {
    const possibleOperationTypes = Object.keys(fieldByOperation) as OperationType[];
    const validOperationTypes: OperationType[] = [];

    if (!selectedColumn) {
      validOperationTypes.push(...(Object.keys(fieldByOperation) as OperationType[]));
    } else if (hasField(selectedColumn) && operationByField[selectedColumn.sourceField]) {
      validOperationTypes.push(...operationByField[selectedColumn.sourceField]!);
    }

    return _.uniqBy(
      [
        ...asOperationOptions(validOperationTypes, true),
        ...asOperationOptions(possibleOperationTypes, false),
      ],
      'operationType'
    );
  }

  const [builderMode, setBuilderMode] = useState(false);

  const [cursor, setCursor] = useState(selectedColumn);
  const [editState, setEditState] = useState(selectedColumn);

  function getSideNavItems(): EuiListGroupItemProps[] {
    return getOperationTypes()
      .filter(({ operationType }) => {
        return !operationDefinitionMap[operationType].showInBuilder;
      })
      .map(({ operationType, compatibleWithCurrentField }) => {
        const isActive = Boolean(
          incompatibleSelectedOperationType === operationType ||
            (!incompatibleSelectedOperationType &&
              selectedColumn &&
              selectedColumn.operationType === operationType)
        );

        let color: EuiListGroupItemProps['color'] = 'primary';
        if (isActive) {
          color = 'text';
        } else if (!compatibleWithCurrentField) {
          color = 'subdued';
        }

        let label: EuiListGroupItemProps['label'] = operationPanels[operationType].displayName;
        if (isActive) {
          label = <strong>{operationPanels[operationType].displayName}</strong>;
        }

        return {
          id: operationType as string,
          label,
          color,
          isActive,
          size: 's',
          className: 'lnsIndexPatternDimensionEditor__operation',
          'data-test-subj': `lns-indexPatternDimension${
            compatibleWithCurrentField ? '' : 'Incompatible'
          }-${operationType}`,
          onClick() {
            if (!selectedColumn || !compatibleWithCurrentField) {
              const possibleFields = fieldByOperation[operationType] || [];

              if (possibleFields.length === 1) {
                setState(
                  changeColumn({
                    state,
                    layerId,
                    columnId,
                    newColumn: buildColumn({
                      columnId,
                      columns: props.state.layers[props.layerId].columns,
                      suggestedPriority: props.suggestedPriority,
                      layerId: props.layerId,
                      op: operationType,
                      indexPattern: currentIndexPattern,
                      field: fieldMap[possibleFields[0]],
                      previousColumn: selectedColumn,
                    }),
                  })
                );
              } else {
                setInvalidOperationType(operationType);
              }
              trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
              return;
            }
            if (incompatibleSelectedOperationType) {
              setInvalidOperationType(null);
            }
            if (selectedColumn.operationType === operationType) {
              return;
            }
            const newColumn: IndexPatternColumn = buildColumn({
              columnId,
              columns: props.state.layers[props.layerId].columns,
              suggestedPriority: props.suggestedPriority,
              layerId: props.layerId,
              op: operationType,
              indexPattern: currentIndexPattern,
              field: fieldMap[selectedColumn.sourceField],
              previousColumn: selectedColumn,
            });

            trackUiEvent(
              `indexpattern_dimension_operation_from_${selectedColumn.operationType}_to_${operationType}`
            );
            setState(
              changeColumn({
                state,
                layerId,
                columnId,
                newColumn,
              })
            );
          },
        };
      });
  }

  function getBuilderSideNavItems(): EuiListGroupItemProps[] {
    return getOperationTypes().map(({ operationType, compatibleWithCurrentField }) => {
      const color: EuiListGroupItemProps['color'] = 'primary';

      const label: EuiListGroupItemProps['label'] = operationPanels[operationType].displayName;

      return {
        id: operationType as string,
        label,
        color,
        isActive: false,
        size: 's',
        className: 'lnsIndexPatternDimensionEditor__operation',
        'data-test-subj': `lns-indexPatternDimension${
          compatibleWithCurrentField ? '' : 'Incompatible'
        }-${operationType}`,
        onClick() {
          if (!cursor) {
            const possibleFields = fieldByOperation[operationType] || [];
            const newRoot = buildColumn({
              columnId,
              columns: props.state.layers[props.layerId].columns,
              suggestedPriority: props.suggestedPriority,
              layerId: props.layerId,
              op: operationType,
              indexPattern: currentIndexPattern,
              field: fieldMap[possibleFields[0]],
              previousColumn: selectedColumn,
            });
            if (operationDefinitionMap[operationType].nonLeaveNode) {
              setCursor(newRoot);
            }
            if (
              editState &&
              operationDefinitionMap[operationType].canAcceptChild &&
              operationDefinitionMap[operationType].canAcceptChild(newRoot, editState)
            ) {
              newRoot.children = [editState];
            }
            setEditState(newRoot);
          } else {
            const possibleFields = fieldByOperation[operationType] || [];
            const newColumn = buildColumn({
              columnId: uuid(),
              columns: props.state.layers[props.layerId].columns,
              suggestedPriority: props.suggestedPriority,
              layerId: props.layerId,
              op: operationType,
              indexPattern: currentIndexPattern,
              field: fieldMap[possibleFields[0]],
            });
            if (!cursor.children) {
              cursor.children = [];
            }
            cursor.children.push(newColumn);

            // TODO this is super dirty - as we mutated the original tree, we just set it back to itself. Should make a copy
            const newEditState = { ...editState };
            setEditState(newEditState);
            if (operationDefinitionMap[operationType].nonLeaveNode) {
              setCursor(newColumn);
            } else if (cursor === editState) {
              setCursor(newEditState);
            }
          }
        },
      };
    });
  }

  if (!builderMode) {
    return (
      <div id={columnId} className="lnsIndexPatternDimensionEditor">
        <EuiFlexGroup gutterSize="s" direction="column">
          <EuiFlexItem>
            <EuiButton onClick={() => setBuilderMode(true)}>Go to builder mode</EuiButton>
            <FieldSelect
              currentIndexPattern={currentIndexPattern}
              existingFields={state.existingFields}
              fieldMap={fieldMap}
              operationFieldSupportMatrix={operationFieldSupportMatrix}
              selectedColumnOperationType={selectedColumn && selectedColumn.operationType}
              selectedColumnSourceField={
                selectedColumn && hasField(selectedColumn) ? selectedColumn.sourceField : undefined
              }
              incompatibleSelectedOperationType={incompatibleSelectedOperationType}
              onDeleteColumn={() => {
                setState(
                  deleteColumn({
                    state,
                    layerId,
                    columnId,
                  })
                );
              }}
              onChoose={(choice) => {
                let column: IndexPatternColumn;
                if (
                  !incompatibleSelectedOperationType &&
                  selectedColumn &&
                  'field' in choice &&
                  choice.operationType === selectedColumn.operationType
                ) {
                  // If we just changed the field are not in an error state and the operation didn't change,
                  // we use the operations onFieldChange method to calculate the new column.
                  column = changeField(selectedColumn, currentIndexPattern, fieldMap[choice.field]);
                } else {
                  // Otherwise we'll use the buildColumn method to calculate a new column
                  const compatibleOperations =
                    ('field' in choice &&
                      operationFieldSupportMatrix.operationByField[choice.field]) ||
                    [];
                  let operation;
                  if (compatibleOperations.length > 0) {
                    operation =
                      incompatibleSelectedOperationType &&
                      compatibleOperations.includes(incompatibleSelectedOperationType)
                        ? incompatibleSelectedOperationType
                        : compatibleOperations[0];
                  } else if ('field' in choice) {
                    operation = choice.operationType;
                  }
                  column = buildColumn({
                    columnId,
                    columns: props.state.layers[props.layerId].columns,
                    field: fieldMap[choice.field],
                    indexPattern: currentIndexPattern,
                    layerId: props.layerId,
                    suggestedPriority: props.suggestedPriority,
                    op: operation as OperationType,
                    previousColumn: selectedColumn,
                  });
                }

                // TODO make sure it's put into the right place in the tree
                setState(
                  changeColumn({
                    state,
                    layerId,
                    columnId,
                    newColumn: column,
                    keepParams: false,
                  })
                );
                setInvalidOperationType(null);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem
                grow={null}
                className={classNames('lnsIndexPatternDimensionEditor__left')}
              >
                <EuiListGroup gutterSize="none" listItems={getSideNavItems()} />
              </EuiFlexItem>
              <EuiFlexItem grow={true} className="lnsIndexPatternDimensionEditor__right">
                {incompatibleSelectedOperationType && selectedColumn && (
                  <>
                    <EuiCallOut
                      data-test-subj="indexPattern-invalid-operation"
                      title={i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                        defaultMessage: 'To use this function, select a different field.',
                      })}
                      color="warning"
                      size="s"
                      iconType="sortUp"
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
                {incompatibleSelectedOperationType && !selectedColumn && (
                  <>
                    <EuiCallOut
                      size="s"
                      data-test-subj="indexPattern-fieldless-operation"
                      title={i18n.translate('xpack.lens.indexPattern.fieldlessOperationLabel', {
                        defaultMessage: 'To use this function, select a field.',
                      })}
                      iconType="sortUp"
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
                {!incompatibleSelectedOperationType && ParamEditor && (
                  <>
                    <ParamEditor
                      state={state}
                      setState={setState}
                      columnId={columnId}
                      currentColumn={state.layers[layerId].columns[columnId]}
                      storage={props.storage}
                      uiSettings={props.uiSettings}
                      savedObjectsClient={props.savedObjectsClient}
                      layerId={layerId}
                      http={props.http}
                      dateRange={props.dateRange}
                      data={props.data}
                    />
                    <EuiSpacer size="m" />
                  </>
                )}
                {!incompatibleSelectedOperationType && selectedColumn && (
                  <EuiFormRow
                    label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
                      defaultMessage: 'Label',
                      description: 'Label of a column of data',
                    })}
                    display="rowCompressed"
                  >
                    <LabelInput
                      value={selectedColumn.label}
                      onChange={(value) => {
                        setState({
                          ...state,
                          layers: {
                            ...state.layers,
                            [layerId]: {
                              ...state.layers[layerId],
                              columns: {
                                ...state.layers[layerId].columns,
                                [columnId]: {
                                  ...selectedColumn,
                                  label: value,
                                  customLabel: true,
                                },
                              },
                            },
                          },
                        });
                      }}
                    />
                  </EuiFormRow>
                )}

                {!hideGrouping && (
                  <BucketNestingEditor
                    layer={state.layers[props.layerId]}
                    columnId={props.columnId}
                    setColumns={(columnOrder) => {
                      setState({
                        ...state,
                        layers: {
                          ...state.layers,
                          [props.layerId]: {
                            ...state.layers[props.layerId],
                            columnOrder,
                          },
                        },
                      });
                    }}
                  />
                )}

                {selectedColumn && selectedColumn.dataType === 'number' ? (
                  <FormatSelector
                    selectedColumn={selectedColumn}
                    onChange={(newFormat) => {
                      setState(
                        updateColumnParam({
                          state,
                          layerId,
                          currentColumn: selectedColumn,
                          paramName: 'format',
                          value: newFormat,
                        })
                      );
                    }}
                  />
                ) : null}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  function renderBuilderNode(column: IndexPatternColumn) {
    return (
      <React.Fragment key={column.id}>
        <p>Selected operation: {column.operationType}</p>
        {!operationDefinitionMap[column.operationType].nonLeaveNode && (
          <FieldSelect
            currentIndexPattern={currentIndexPattern}
            existingFields={state.existingFields}
            fieldMap={fieldMap}
            incompatibleSelectedOperationType={null}
            operationFieldSupportMatrix={operationFieldSupportMatrix}
            selectedColumnOperationType={editState && editState.operationType}
            selectedColumnSourceField={hasField(column) ? column.sourceField : undefined}
            onDeleteColumn={() => {}}
            onChoose={(choice) => {
              const newColumn = changeField(column, currentIndexPattern, fieldMap[choice.field]);

              const nodeQueue = [editState];

              while (nodeQueue.length > 0) {
                const currentNode = nodeQueue.shift();
                if (currentNode === column) {
                  // eslint-disable-next-line guard-for-in
                  for (const key in newColumn) {
                    currentNode[key] = newColumn[key];
                  }
                  break;
                }
                nodeQueue.push(...(currentNode.children || []));
              }

              // TODO this is super dirty - as we mutated the original tree, we just set it back to itself. Should make a copy
              const newEditState = { ...editState };
              setEditState(newEditState);
              if (cursor === editState) {
                setCursor(newEditState);
              }
            }}
          />
        )}
        {cursor !== column && operationDefinitionMap[column.operationType].nonLeaveNode && (
          <EuiButton
            onClick={() => {
              setCursor(column);
            }}
          >
            Edit here
          </EuiButton>
        )}
        <EuiButton
          onClick={() => {
            if (editState === column) {
              setEditState(undefined);
              setCursor(undefined);
              return;
            }
            const nodeQueue = [editState];

            while (nodeQueue.length > 0) {
              const currentNode = nodeQueue.shift();
              for (const index in currentNode.children || []) {
                if (currentNode.children![index] === column) {
                  currentNode.children = currentNode.children!.filter((child) => child !== column);
                }
              }
              nodeQueue.push(...(currentNode.children || []));
            }

            // TODO this is super dirty - as we mutated the original tree, we just set it back to itself. Should make a copy
            const newEditState = { ...editState };
            setEditState({ ...editState });
            // reset cursor to the root, can be smarter
            setCursor(newEditState);
          }}
        >
          Delete
        </EuiButton>
        {cursor === column && <p>The cursor is here</p>}
        {column.children &&
          column.children.length === 1 &&
          column.children.map((childColumn) => renderBuilderNode(childColumn))}
        {column.children && column.children.length > 1 && (
          <div style={{ marginLeft: 50 }}>
            {column.children.map((childColumn) => renderBuilderNode(childColumn))}
          </div>
        )}
      </React.Fragment>
    );
  }

  return (
    <div id={columnId} className="lnsIndexPatternDimensionEditor">
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={null} className={classNames('lnsIndexPatternDimensionEditor__left')}>
          <EuiListGroup gutterSize="none" listItems={getBuilderSideNavItems()} />
        </EuiFlexItem>
        <EuiFlexItem grow={true} className="lnsIndexPatternDimensionEditor__right">
          {editState && renderBuilderNode(editState)}

          {editState && (
            <EuiButton
              onClick={() => {
                console.log(editState);
                // TODO flush it into the actual state
              }}
            >
              Apply
            </EuiButton>
          )}

          {selectedColumn && selectedColumn.dataType === 'number' ? (
            <FormatSelector
              selectedColumn={selectedColumn}
              onChange={(newFormat) => {
                setState(
                  updateColumnParam({
                    state,
                    layerId,
                    currentColumn: selectedColumn,
                    paramName: 'format',
                    value: newFormat,
                  })
                );
              }}
            />
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
