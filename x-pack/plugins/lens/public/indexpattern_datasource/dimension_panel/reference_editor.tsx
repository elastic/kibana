/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './dimension_editor.scss';
import _ from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSpacer, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { OperationSupportMatrix } from './operation_support';
import type { OperationType } from '../indexpattern';
import {
  operationDefinitionMap,
  getOperationDisplay,
  insertOrReplaceColumn,
  replaceColumn,
  deleteColumn,
  RequiredReference,
  isOperationAllowedAsReference,
  FieldBasedIndexPatternColumn,
} from '../operations';
import { FieldSelect } from './field_select';
import { hasField } from '../utils';
import type { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';

const operationPanels = getOperationDisplay();

export interface ReferenceEditorProps {
  layer: IndexPatternLayer;
  parentColumnId: string;
  selectionStyle: 'full' | 'field';
  validation: RequiredReference;
  columnId: string;
  updateLayer: (newLayer: IndexPatternLayer) => void;
  currentIndexPattern: IndexPattern;
  existingFields: IndexPatternPrivateState['existingFields'];
}

export function ReferenceEditor(props: ReferenceEditorProps) {
  const {
    layer,
    columnId,
    updateLayer,
    currentIndexPattern,
    existingFields,
    validation,
    selectionStyle,
  } = props;

  const column = layer.columns[columnId];
  const selectedOperationDefinition = column && operationDefinitionMap[column.operationType];

  const incompleteInfo = layer.incompleteColumns ? layer.incompleteColumns[columnId] : undefined;
  const incompleteOperation = incompleteInfo?.operationType;
  const incompleteField = incompleteInfo?.sourceField ?? null;

  // Basically the operation support matrix, but different validation
  const operationSupportMatrix: OperationSupportMatrix & {
    operationTypes: Set<OperationType>;
  } = useMemo(() => {
    const operationTypes: Set<OperationType> = new Set();
    const operationWithoutField: Set<OperationType> = new Set();
    const operationByField: Partial<Record<string, Set<OperationType>>> = {};
    const fieldByOperation: Partial<Record<OperationType, Set<string>>> = {};
    Object.values(operationDefinitionMap)
      .sort((op1, op2) => {
        return op1.displayName.localeCompare(op2.displayName);
      })
      .forEach((op) => {
        if (op.input === 'field') {
          const allFields = currentIndexPattern.fields.filter((field) =>
            isOperationAllowedAsReference({ operationType: op.type, validation, field })
          );
          if (allFields.length) {
            operationTypes.add(op.type);
            fieldByOperation[op.type] = new Set(allFields.map(({ name }) => name));
            allFields.forEach((field) => {
              if (!operationByField[field.name]) {
                operationByField[field.name] = new Set();
              }
              operationByField[field.name]?.add(op.type);
            });
          }
        } else if (isOperationAllowedAsReference({ operationType: op.type, validation })) {
          operationTypes.add(op.type);
          operationWithoutField.add(op.type);
        }
      });
    return {
      operationTypes,
      operationWithoutField,
      operationByField,
      fieldByOperation,
    };
  }, [currentIndexPattern, validation]);

  const functionOptions: Array<EuiComboBoxOptionOption<OperationType>> = [];
  operationSupportMatrix.operationTypes.forEach((operationType) => {
    const label = operationPanels[operationType].displayName;
    // const isCompatible = !column || column && hasField(column) &&

    functionOptions.push({
      label,
      value: operationType,
      className: 'lnsIndexPatternDimensionEditor__operation',
      // 'data-test-subj': `lns-indexPatternDimension-${operationType}${
      //   compatibleWithCurrentField ? '' : ' incompatible'
      // }`,
    });
  });

  function onChooseFunction(operationType: OperationType) {
    // Clear invalid state because we are creating a valid column
    if (column?.operationType === operationType) {
      return;
    }
    const possibleFieldNames = operationSupportMatrix.fieldByOperation[operationType];
    const possibleField =
      possibleFieldNames?.size === 1
        ? currentIndexPattern.getFieldByName(possibleFieldNames.values().next().value)
        : undefined;

    updateLayer(
      insertOrReplaceColumn({
        layer,
        columnId,
        op: operationType,
        indexPattern: currentIndexPattern,
        field: possibleField,
      })
    );
    trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
    return;
  }

  const selectedOption = incompleteInfo?.operationType
    ? [functionOptions.find(({ value }) => value === incompleteInfo.operationType)!]
    : column
    ? [functionOptions.find(({ value }) => value === column.operationType)!]
    : [];

  // The current operation is invalid if
  // const invalidOperation =
  //   Boolean(incompleteInfo?.operationType) ||
  //   (column &&
  //     selectedOperationDefinition.input === 'field' &&
  //     !operationSupportMatrix.fieldByOperation[column.operationType]?.size);
  const invalidField =
    column &&
    selectedOperationDefinition.input === 'field' &&
    !operationSupportMatrix.fieldByOperation[column.operationType]?.size;

  return (
    <div id={columnId}>
      <div>
        {selectionStyle !== 'field' ? (
          <>
            <EuiFormRow
              data-test-subj="indexPattern-field-selection-row"
              label={i18n.translate('xpack.lens.indexPattern.chooseSubFunction', {
                defaultMessage: 'Choose a sub-function',
              })}
              fullWidth
              isInvalid={Boolean(incompleteInfo?.operationType)}
              // error={
              // column
              //   ? i18n.translate('xpack.lens.indexPattern.invalidOperationLabel', {
              //       defaultMessage: 'To use this function, select a different field.',
              //     })
              //   : undefined
              // }
            >
              <EuiComboBox
                fullWidth
                compressed
                isClearable={false}
                data-test-subj="indexPattern-reference-function"
                placeholder={i18n.translate(
                  'xpack.lens.indexPattern.referenceFunctionPlaceholder',
                  {
                    defaultMessage: 'Sub-function',
                  }
                )}
                options={functionOptions}
                // isInvalid={Boolean(incompatibleSelectedOperationType)}
                selectedOptions={selectedOption}
                singleSelection={{ asPlainText: true }}
                onChange={(choices) => {
                  if (choices.length === 0) {
                    // onDeleteColumn();
                    updateLayer(deleteColumn({ layer, columnId }));
                    return;
                  }

                  trackUiEvent('indexpattern_dimension_field_changed');

                  onChooseFunction(choices[0].value!);
                }}
              />
            </EuiFormRow>
            <EuiSpacer size="s" />
          </>
        ) : null}

        {!column ||
        // (incompatibleSelectedOperationType &&
        //   operationDefinitionMap[incompatibleSelectedOperationType].input === 'field') ? (
        selectedOperationDefinition.input === 'field' ? (
          <EuiFormRow
            data-test-subj="indexPattern-field-selection-row"
            label={i18n.translate('xpack.lens.indexPattern.chooseField', {
              defaultMessage: 'Select a field',
            })}
            fullWidth
            // isInvalid={Boolean(incompatibleSelectedOperationType || currentFieldIsInvalid)}
            isInvalid={invalidField}
            // error={getErrorMessage(
            //   column,
            //   Boolean(incompatibleSelectedOperationType),
            //   selectedOperationDefinition?.input,
            //   currentFieldIsInvalid
            // )}
          >
            <FieldSelect
              fieldIsInvalid={invalidField}
              currentIndexPattern={currentIndexPattern}
              existingFields={existingFields}
              operationSupportMatrix={operationSupportMatrix}
              selectedOperationType={
                // Allows operation to be selected before creating a valid column
                column ? column.operationType : incompleteOperation
              }
              selectedField={
                // Allows field to be selected
                incompleteField
                  ? incompleteField
                  : (column as FieldBasedIndexPatternColumn)?.sourceField
              }
              incompleteOperation={incompleteOperation}
              onDeleteColumn={() => {
                updateLayer(deleteColumn({ layer, columnId }));
              }}
              onChoose={(choice) => {
                let newLayer: IndexPatternLayer;
                if (
                  !incompleteInfo?.operationType &&
                  column &&
                  'field' in choice &&
                  choice.operationType === column.operationType
                ) {
                  // Replaces just the field
                  newLayer = replaceColumn({
                    layer,
                    columnId,
                    indexPattern: currentIndexPattern,
                    op: choice.operationType,
                    field: currentIndexPattern.getFieldByName(choice.field)!,
                  });
                } else {
                  // Finds a new operation
                  const compatibleOperations =
                    ('field' in choice && operationSupportMatrix.operationByField[choice.field]) ||
                    new Set();
                  let operation;
                  if (compatibleOperations.size > 0) {
                    operation =
                      incompleteInfo?.operationType &&
                      compatibleOperations.has(incompleteInfo.operationType as OperationType)
                        ? incompleteInfo.operationType
                        : compatibleOperations.values().next().value;
                  } else if ('field' in choice) {
                    operation = choice.operationType;
                  }
                  newLayer = insertOrReplaceColumn({
                    layer,
                    columnId,
                    field: currentIndexPattern.getFieldByName(choice.field),
                    indexPattern: currentIndexPattern,
                    op: operation as OperationType,
                  });
                }
                updateLayer(newLayer);
                // setInvalidOperationType(null);
              }}
            />
          </EuiFormRow>
        ) : null}
      </div>
    </div>
  );
}

{
  /* function getErrorMessage(
  column: IndexPatternColumn | undefined,
  incompatibleSelectedOperationType: boolean,
  input: 'none' | 'field' | 'fullReference' | undefined,
  fieldInvalid: boolean
) {
  if (column && incompatibleSelectedOperationType) {
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
} */
}
