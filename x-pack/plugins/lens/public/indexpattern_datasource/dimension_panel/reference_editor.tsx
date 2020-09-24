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
  EuiSpacer,
  EuiListGroupItemProps,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { EuiFormLabel } from '@elastic/eui';
import { IndexPatternColumn, OperationType } from '../indexpattern';
import { IndexPatternDimensionEditorProps, OperationSupportMatrix } from './dimension_panel';
import {
  operationDefinitionMap,
  getOperationDisplay,
  buildColumn,
  changeField,
} from '../operations';
import {
  deleteColumn,
  changeColumn,
  updateColumnParam,
  changeInnerOperation,
} from '../state_helpers';
import { FieldSelect } from './field_select';
import { hasField } from '../utils';
import { IndexPattern, IndexPatternField } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';

const operationPanels = getOperationDisplay();

export interface DimensionEditorProps extends IndexPatternDimensionEditorProps {
  selectedColumn?: IndexPatternColumn;
  operationSupportMatrix: OperationSupportMatrix;
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

export function ReferenceEditor(props: DimensionEditorProps) {
  const {
    selectedColumn,
    operationSupportMatrix,
    state,
    columnId,
    setState,
    layerId,
    currentIndexPattern,
  } = props;
  const { operationByField, fieldByOperation } = operationSupportMatrix;
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
        ...asOperationOptions(
          operationSupportMatrix.operationWithoutField,
          !selectedColumn || !hasField(selectedColumn)
        ),
      ],
      'operationType'
    );
  }

  const functionOptions: Array<EuiComboBoxOptionOption<OperationType>> = getOperationTypes().map(
    ({ operationType, compatibleWithCurrentField }) => {
      const label = operationPanels[operationType].displayName;

      return {
        label,
        value: operationType,
        className: 'lnsIndexPatternDimensionEditor__operation',
        'data-test-subj': `lns-indexPatternDimension-${operationType}${
          compatibleWithCurrentField ? '' : ' incompatible'
        }`,
      };
    }
  );

  function onChooseFunction(operationType: OperationType) {
    if (operationDefinitionMap[operationType].input === 'none') {
      // Clear invalid state because we are creating a valid column
      setInvalidOperationType(null);
      if (selectedColumn?.operationType === operationType) {
        return;
      }
      setState(
        changeInnerOperation({
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
      // } else if (operationDefinitionMap[operationType].input === 'reference') {
      //   // Clear invalid state because we are creating a valid column
      //   setInvalidOperationType(null);
      //   if (selectedColumn?.operationType === operationType) {
      //     return;
      //   }
      //   setState(
      //     changeColumn({
      //       state,
      //       layerId,
      //       columnId,
      //       newColumn: buildColumn({
      //         columns: props.state.layers[props.layerId].columns,
      //         suggestedPriority: props.suggestedPriority,
      //         layerId: props.layerId,
      //         op: operationType,
      //         indexPattern: currentIndexPattern,
      //         previousColumn: selectedColumn,
      //       }),
      //     })
      //   );
      //   trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
      //   return;
      // } else if (!selectedColumn || !compatibleWithCurrentField) {
    } else if (!selectedColumn) {
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
      changeInnerOperation({
        state,
        layerId,
        columnId,
        newColumn,
      })
    );
  }

  return (
    <div id={columnId}>
      <div className="lnsIndexPatternDimensionEditor__section lnsIndexPatternDimensionEditor__section--shaded">
        <EuiFormRow
          data-test-subj="indexPattern-field-selection-row"
          label={i18n.translate('xpack.lens.indexPattern.chooseFunction', {
            defaultMessage: 'Choose a function',
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
          <EuiComboBox
            fullWidth
            compressed
            isClearable={false}
            data-test-subj="indexPattern-reference-function"
            placeholder={i18n.translate('xpack.lens.indexPattern.referenceFunctionPlaceholder', {
              defaultMessage: 'Function',
            })}
            options={functionOptions}
            isInvalid={Boolean(incompatibleSelectedOperationType)}
            selectedOptions={
              selectedColumn
                ? [functionOptions.find(({ value }) => value === selectedColumn.operationType)!]
                : []
            }
            singleSelection={{ asPlainText: true }}
            onChange={(choices) => {
              if (choices.length === 0) {
                // onDeleteColumn();
                return;
              }

              // trackUiEvent('indexpattern_dimension_field_changed');

              onChooseFunction(choices[0].value!);
            }}
          />
        </EuiFormRow>
        {!selectedColumn ||
        selectedOperationDefinition?.input === 'field' ||
        (incompatibleSelectedOperationType &&
          operationDefinitionMap[incompatibleSelectedOperationType].input === 'field') ? (
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
                  changeInnerOperation({
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
        {!incompatibleSelectedOperationType && selectedColumn && ParamEditor && (
          <>
            <ParamEditor
              state={state}
              setState={setState}
              columnId={columnId}
              currentColumn={state.layers[layerId].innerOperations[columnId]}
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
    </div>
  );
}
