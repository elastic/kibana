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
} from '@elastic/eui';
import { EuiFormLabel } from '@elastic/eui';
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
import { hasField, fieldIsInvalid } from '../utils';
import { BucketNestingEditor } from './bucket_nesting_editor';
import { IndexPattern, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { FormatSelector } from './format_selector';

const operationPanels = getOperationDisplay();

export interface DimensionEditorProps extends IndexPatternDimensionEditorProps {
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

  const currentFieldIsInvalid =
    !selectedColumn || fieldIsInvalid(selectedColumn, currentIndexPattern.id, state);

  const sideNavItems: EuiListGroupItemProps[] = getOperationTypes().map(
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
          // todo: when moving from terms agg to filters, we want to create a filter `$field.name : *`
          // it probably has to be re-thought when removing the field name.
          const isTermsToFilters =
            selectedColumn?.operationType === 'terms' && operationType === 'filters';

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
          if (incompatibleSelectedOperationType && !isTermsToFilters) {
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
            defaultMessage: 'Choose a function',
          })}
        </EuiFormLabel>
        <EuiSpacer size="s" />
        <EuiListGroup
          className={sideNavItems.length > 3 ? 'lnsIndexPatternDimensionEditor__columns' : ''}
          gutterSize="none"
          listItems={sideNavItems}
          maxWidth={false}
        />
      </div>
      <EuiSpacer size="s" />
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        <EuiFormRow
          data-test-subj="indexPattern-field-selection-row"
          label={i18n.translate('xpack.lens.indexPattern.chooseField', {
            defaultMessage: 'Choose a field',
          })}
          fullWidth
          isInvalid={Boolean(incompatibleSelectedOperationType)}
          error={
            selectedColumn
              ? i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
                  defaultMessage: 'To use this function, select a different field.',
                })
              : undefined
          }
        >
          <FieldSelect
            currentIndexPattern={currentIndexPattern}
            existingFields={state.existingFields}
            fieldMap={fieldMap}
            operationFieldSupportMatrix={operationFieldSupportMatrix}
            selectedColumnOperationType={selectedColumn && selectedColumn.operationType}
            selectedColumnSourceField={
              selectedColumn && hasField(selectedColumn) ? selectedColumn.sourceField : undefined
            }
            fieldIsInvalid={currentFieldIsInvalid}
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
        </EuiFormRow>

        {!currentFieldIsInvalid && !incompatibleSelectedOperationType && ParamEditor && (
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

        {!hideGrouping && (
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
    </div>
  );
}
