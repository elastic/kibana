/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './dimension_editor.scss';
import _ from 'lodash';
import React, { useState, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiListGroup,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiListGroupItemProps,
  EuiFormLabel,
} from '@elastic/eui';
import { IndexPatternDimensionEditorProps, OperationSupportMatrix } from './dimension_panel';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import {
  operationDefinitionMap,
  getOperationDisplay,
  buildColumn,
  changeField,
} from '../operations';
import { deleteColumn, changeColumn, updateColumnParam } from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField, fieldIsInvalid } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPattern, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { FormatSelector } from './format_selector';

const operationPanels = getOperationDisplay();

export interface DimensionEditorProps extends IndexPatternDimensionEditorProps {
  selectedColumn?: IndexPatternColumn;
  operationSupportMatrix: OperationSupportMatrix;
  currentIndexPattern: IndexPattern;
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
    <EuiFormRow
      label={i18n.translate('xpack.lens.indexPattern.columnLabel', {
        defaultMessage: 'Display name',
        description: 'Display name of a column of data',
      })}
      display="columnCompressed"
      fullWidth
    >
      <EuiFieldText
        compressed
        data-test-subj="indexPattern-label-edit"
        value={inputValue}
        onChange={handleInputChange}
      />
    </EuiFormRow>
  );
};

export function DimensionEditor(props: DimensionEditorProps) {
  const {
    selectedColumn,
    operationSupportMatrix,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
    hideGrouping,
  } = props;
  const { fieldByOperation, operationWithoutField } = operationSupportMatrix;
  const [
    incompatibleSelectedOperationType,
    setInvalidOperationType,
  ] = useState<OperationType | null>(null);

  const selectedOperationDefinition =
    selectedColumn && operationDefinitionMap[selectedColumn.operationType];

  const ParamEditor = selectedOperationDefinition?.paramEditor;

  const fieldMap: Record<string, IndexPatternField> = useMemo(() => {
    const fields: Record<string, IndexPatternField> = {};
    currentIndexPattern.fields.forEach((field) => {
      fields[field.name] = field;
    });
    return fields;
  }, [currentIndexPattern]);

  const possibleOperations = useMemo(() => {
    return Object.values(operationDefinitionMap)
      .sort((op1, op2) => {
        return op1.displayName.localeCompare(op2.displayName);
      })
      .map((def) => def.type)
      .filter(
        (type) => fieldByOperation[type]?.length || operationWithoutField.indexOf(type) !== -1
      );
  }, [fieldByOperation, operationWithoutField]);

  // Operations are compatible if they match inputs. They are always compatible in
  // the empty state. Field-based operations are not compatible with field-less operations.
  const operationsWithCompatibility = [...possibleOperations].map((operationType) => {
    const definition = operationDefinitionMap[operationType];

    return {
      operationType,
      compatibleWithCurrentField:
        !selectedColumn ||
        (selectedColumn &&
          hasField(selectedColumn) &&
          definition.input === 'field' &&
          fieldByOperation[operationType]?.indexOf(selectedColumn.sourceField) !== -1) ||
        (selectedColumn && !hasField(selectedColumn) && definition.input !== 'field'),
    };
  });

  const selectedColumnSourceField =
    selectedColumn && 'sourceField' in selectedColumn ? selectedColumn.sourceField : undefined;

  const currentFieldIsInvalid = useMemo(
    () =>
      fieldIsInvalid(selectedColumnSourceField, selectedColumn?.operationType, currentIndexPattern),
    [selectedColumnSourceField, selectedColumn?.operationType, currentIndexPattern]
  );

  const sideNavItems: EuiListGroupItemProps[] = operationsWithCompatibility.map(
    ({ operationType, compatibleWithCurrentField }) => {
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
        'data-test-subj': `lns-indexPatternDimension-${operationType}${
          compatibleWithCurrentField ? '' : ' incompatible'
        }`,
        onClick() {
          if (operationDefinitionMap[operationType].input === 'none') {
            // Clear invalid state because we are creating a valid column
            setInvalidOperationType(null);
            if (selectedColumn?.operationType === operationType) {
              return;
            }
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
                  previousColumn: selectedColumn,
                }),
              })
            );
            trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
            return;
          } else if (!selectedColumn || !compatibleWithCurrentField) {
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

          setInvalidOperationType(null);

          if (selectedColumn?.operationType === operationType) {
            return;
          }

          const newColumn: IndexPatternColumn = buildColumn({
            columns: props.state.layers[props.layerId].columns,
            suggestedPriority: props.suggestedPriority,
            layerId: props.layerId,
            op: operationType,
            indexPattern: currentIndexPattern,
            field: hasField(selectedColumn) ? fieldMap[selectedColumn.sourceField] : undefined,
            previousColumn: selectedColumn,
          });

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
    }
  );

  return (
    <div id={columnId}>
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        <EuiFormLabel>
          {i18n.translate('xpack.lens.indexPattern.functionsLabel', {
            defaultMessage: 'Select a function',
          })}
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiListGroup
          className={sideNavItems.length > 3 ? 'lnsIndexPatternDimensionEditor__columns' : ''}
          gutterSize="none"
          listItems={
            // add a padding item containing a non breakable space if the number of operations is not even
            // otherwise the column layout will break within an element
            sideNavItems.length % 2 === 1 ? [...sideNavItems, { label: '\u00a0' }] : sideNavItems
          }
          maxWidth={false}
        />
      </div>
      <EuiSpacer size="s" />
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        {!selectedColumn ||
        selectedOperationDefinition?.input === 'field' ||
        (incompatibleSelectedOperationType &&
          operationDefinitionMap[incompatibleSelectedOperationType].input === 'field') ? (
          <EuiFormRow
            data-test-subj="indexPattern-field-selection-row"
            label={i18n.translate('xpack.lens.indexPattern.chooseField', {
              defaultMessage: 'Select a field',
            })}
            fullWidth
            isInvalid={Boolean(incompatibleSelectedOperationType || currentFieldIsInvalid)}
            error={getErrorMessage(
              selectedColumn,
              Boolean(incompatibleSelectedOperationType),
              selectedOperationDefinition?.input,
              currentFieldIsInvalid
            )}
          >
            <FieldSelect
              fieldIsInvalid={currentFieldIsInvalid}
              currentIndexPattern={currentIndexPattern}
              existingFields={state.existingFields}
              fieldMap={fieldMap}
              operationSupportMatrix={operationSupportMatrix}
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
                    ('field' in choice && operationSupportMatrix.operationByField[choice.field]) ||
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
          </EuiFormRow>
        ) : null}

        {!currentFieldIsInvalid &&
          !incompatibleSelectedOperationType &&
          selectedColumn &&
          ParamEditor && (
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
            </>
          )}
      </div>

      <EuiSpacer size="s" />

      {!currentFieldIsInvalid && (
        <div className="lnsIndexPatternDimensionEditor__section">
          {!incompatibleSelectedOperationType && selectedColumn && (
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
          )}

          {!incompatibleSelectedOperationType && !hideGrouping && (
            <BucketNestingEditor
              fieldMap={fieldMap}
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
        </div>
      )}
    </div>
  );
}
function getErrorMessage(
  selectedColumn: IndexPatternColumn | undefined,
  incompatibleSelectedOperationType: boolean,
  input: 'none' | 'field' | undefined,
  fieldInvalid: boolean
) {
  if (selectedColumn && incompatibleSelectedOperationType) {
    if (input === 'field') {
      return i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
        defaultMessage: 'To use this function, select a different field.',
      });
    }
    return i18n.translate('xpack.lens.indexPattern.chooseFieldLabel', {
      defaultMessage: 'To use this function, select a field.',
    });
  }
  if (fieldInvalid) {
    return i18n.translate('xpack.lens.indexPattern.invalidFieldLabel', {
      defaultMessage: 'Invalid field. Check your index pattern or pick another field.',
    });
  }
}
