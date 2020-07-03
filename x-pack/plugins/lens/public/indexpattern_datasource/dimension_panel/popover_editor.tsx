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

  function getSideNavItems(): EuiListGroupItemProps[] {
    return getOperationTypes().map(({ operationType, compatibleWithCurrentField }) => {
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

  return (
    <div id={columnId} className="lnsIndexPatternDimensionEditor">
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
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
                  columns: props.state.layers[props.layerId].columns,
                  field: fieldMap[choice.field],
                  indexPattern: currentIndexPattern,
                  layerId: props.layerId,
                  suggestedPriority: props.suggestedPriority,
                  op: operation as OperationType,
                  previousColumn: selectedColumn,
                });
              }

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
            <EuiFlexItem grow={null} className={classNames('lnsIndexPatternDimensionEditor__left')}>
              <EuiListGroup gutterSize="none" listItems={getSideNavItems()} />
            </EuiFlexItem>
            <EuiFlexItem grow={true} className="lnsIndexPatternDimensionEditor__right">
              {incompatibleSelectedOperationType && selectedColumn && (
                <EuiCallOut
                  data-test-subj="indexPattern-invalid-operation"
                  title={i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                    defaultMessage: 'To use this function, select a different field.',
                  })}
                  color="warning"
                  size="s"
                  iconType="sortUp"
                />
              )}
              {incompatibleSelectedOperationType && !selectedColumn && (
                <EuiCallOut
                  size="s"
                  data-test-subj="indexPattern-fieldless-operation"
                  title={i18n.translate('xpack.lens.indexPattern.fieldlessOperationLabel', {
                    defaultMessage: 'To use this function, select a field.',
                  })}
                  iconType="sortUp"
                />
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
