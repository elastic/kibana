/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFormRowProps,
  EuiSpacer,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import type { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from 'kibana/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import type { DataPublicPluginStart } from 'src/plugins/data/public';
import type { DateRange } from '../../../common';
import type { OperationSupportMatrix } from './operation_support';
import type { OperationType } from '../indexpattern';
import {
  operationDefinitionMap,
  getOperationDisplay,
  insertOrReplaceColumn,
  deleteColumn,
  isOperationAllowedAsReference,
  FieldBasedIndexPatternColumn,
  RequiredReference,
} from '../operations';
import { FieldSelect } from './field_select';
import { hasField } from '../pure_utils';
import type { IndexPattern, IndexPatternLayer, IndexPatternPrivateState } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import type { ParamEditorCustomProps, VisualizationDimensionGroupConfig } from '../../types';
import type { IndexPatternDimensionEditorProps } from './dimension_panel';

const operationPanels = getOperationDisplay();

export interface ReferenceEditorProps {
  layer: IndexPatternLayer;
  layerId: string;
  activeData?: IndexPatternDimensionEditorProps['activeData'];
  selectionStyle: 'full' | 'field' | 'hidden';
  validation: RequiredReference;
  columnId: string;
  updateLayer: (
    setter: IndexPatternLayer | ((prevLayer: IndexPatternLayer) => IndexPatternLayer)
  ) => void;
  currentIndexPattern: IndexPattern;

  existingFields: IndexPatternPrivateState['existingFields'];
  dateRange: DateRange;
  labelAppend?: EuiFormRowProps['labelAppend'];
  dimensionGroups: VisualizationDimensionGroupConfig[];
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  setIsCloseable: (isCloseable: boolean) => void;

  // Services
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpSetup;
  data: DataPublicPluginStart;
  paramEditorCustomProps?: ParamEditorCustomProps;
}

export function ReferenceEditor(props: ReferenceEditorProps) {
  const {
    layer,
    layerId,
    activeData,
    columnId,
    updateLayer,
    currentIndexPattern,
    existingFields,
    validation,
    selectionStyle,
    dateRange,
    labelAppend,
    dimensionGroups,
    isFullscreen,
    toggleFullscreen,
    setIsCloseable,
    paramEditorCustomProps,
    ...services
  } = props;

  const column = layer.columns[columnId];
  const selectedOperationDefinition = column && operationDefinitionMap[column.operationType];

  const ParamEditor = selectedOperationDefinition?.paramEditor;

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
      .filter(({ hidden }) => !hidden)
      .sort((op1, op2) => {
        return op1.displayName.localeCompare(op2.displayName);
      })
      .forEach((op) => {
        if (op.input === 'field') {
          const allFields = currentIndexPattern.fields.filter((field) =>
            isOperationAllowedAsReference({
              operationType: op.type,
              validation,
              field,
              indexPattern: currentIndexPattern,
            })
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
        } else if (
          isOperationAllowedAsReference({
            operationType: op.type,
            validation,
            indexPattern: currentIndexPattern,
          })
        ) {
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

  const functionOptions: Array<EuiComboBoxOptionOption<OperationType>> = Array.from(
    operationSupportMatrix.operationTypes
  ).map((operationType) => {
    const def = operationDefinitionMap[operationType];
    const label = operationPanels[operationType].displayName;
    const isCompatible =
      !column ||
      (column &&
        hasField(column) &&
        def.input === 'field' &&
        operationSupportMatrix.fieldByOperation[operationType]?.has(column.sourceField)) ||
      (column && !hasField(column) && def.input !== 'field');

    return {
      label,
      value: operationType,
      className: 'lnsIndexPatternDimensionEditor__operation',
      'data-test-subj': `lns-indexPatternDimension-${operationType}${
        isCompatible ? '' : ' incompatible'
      }`,
    };
  });

  function onChooseFunction(operationType: OperationType) {
    if (column?.operationType === operationType) {
      return;
    }
    const possibleFieldNames = operationSupportMatrix.fieldByOperation[operationType];
    if (column && 'sourceField' in column && possibleFieldNames?.has(column.sourceField)) {
      // Reuse the current field if possible
      updateLayer(
        insertOrReplaceColumn({
          layer,
          columnId,
          op: operationType,
          indexPattern: currentIndexPattern,
          field: currentIndexPattern.getFieldByName(column.sourceField),
          visualizationGroups: dimensionGroups,
        })
      );
    } else {
      // If reusing the field is impossible, we generally can't choose for the user.
      // The one exception is if the field is the only possible field, like Count of Records.
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
          visualizationGroups: dimensionGroups,
        })
      );
    }
    trackUiEvent(`indexpattern_dimension_operation_${operationType}`);
    return;
  }

  if (selectionStyle === 'hidden') {
    return null;
  }

  const selectedOption = incompleteOperation
    ? [functionOptions.find(({ value }) => value === incompleteOperation)!]
    : column
    ? [functionOptions.find(({ value }) => value === column.operationType)!]
    : [];

  // If the operationType is incomplete, the user needs to select a field- so
  // the function is marked as valid.
  const showOperationInvalid = !column && !Boolean(incompleteOperation);
  // The field is invalid if the operation has been updated without a field,
  // or if we are in a field-only mode but empty state
  const showFieldInvalid = Boolean(incompleteOperation) || (selectionStyle === 'field' && !column);
  // Check if the field still exists to protect from changes
  const showFieldMissingInvalid = !currentIndexPattern.getFieldByName(
    incompleteField ?? (column as FieldBasedIndexPatternColumn)?.sourceField
  );

  // what about a field changing type and becoming invalid?
  // Let's say this change makes the indexpattern without any number field but the operation was set to a numeric operation.
  // At this point the ComboBox will crash.
  // Therefore check if the selectedOption is in functionOptions and in case fill it in as disabled option
  const showSelectionFunctionInvalid = Boolean(selectedOption.length && selectedOption[0] == null);
  if (showSelectionFunctionInvalid) {
    const selectedOperationType = incompleteOperation || column.operationType;
    const brokenFunctionOption = {
      label: operationPanels[selectedOperationType].displayName,
      value: selectedOperationType,
      className: 'lnsIndexPatternDimensionEditor__operation',
      'data-test-subj': `lns-indexPatternDimension-${selectedOperationType} incompatible`,
    };
    functionOptions.push(brokenFunctionOption);
    selectedOption[0] = brokenFunctionOption;
  }

  return (
    <div id={columnId}>
      <div>
        {selectionStyle !== 'field' ? (
          <>
            <EuiFormRow
              data-test-subj="indexPattern-subFunction-selection-row"
              label={i18n.translate('xpack.lens.indexPattern.chooseSubFunction', {
                defaultMessage: 'Choose a sub-function',
              })}
              fullWidth
              isInvalid={showOperationInvalid || showSelectionFunctionInvalid}
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
                isInvalid={showOperationInvalid || showSelectionFunctionInvalid}
                selectedOptions={selectedOption}
                singleSelection={{ asPlainText: true }}
                onChange={(choices) => {
                  if (choices.length === 0) {
                    updateLayer(
                      deleteColumn({
                        layer,
                        columnId,
                        indexPattern: currentIndexPattern,
                      })
                    );
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

        {!column || selectedOperationDefinition.input === 'field' ? (
          <EuiFormRow
            data-test-subj="indexPattern-reference-field-selection-row"
            label={i18n.translate('xpack.lens.indexPattern.chooseField', {
              defaultMessage: 'Field',
            })}
            fullWidth
            isInvalid={showFieldInvalid || showFieldMissingInvalid}
            labelAppend={labelAppend}
          >
            <FieldSelect
              fieldIsInvalid={showFieldInvalid || showFieldMissingInvalid}
              currentIndexPattern={currentIndexPattern}
              existingFields={existingFields}
              operationByField={operationSupportMatrix.operationByField}
              selectedOperationType={
                // Allows operation to be selected before creating a valid column
                column ? column.operationType : incompleteOperation
              }
              selectedField={
                // Allows field to be selected
                incompleteField ?? (column as FieldBasedIndexPatternColumn)?.sourceField
              }
              incompleteOperation={incompleteOperation}
              markAllFieldsCompatible={selectionStyle === 'field'}
              onDeleteColumn={() => {
                updateLayer(
                  deleteColumn({
                    layer,
                    columnId,
                    indexPattern: currentIndexPattern,
                  })
                );
              }}
              onChoose={(choice) => {
                updateLayer(
                  insertOrReplaceColumn({
                    layer,
                    columnId,
                    indexPattern: currentIndexPattern,
                    op: choice.operationType,
                    field: currentIndexPattern.getFieldByName(choice.field),
                    visualizationGroups: dimensionGroups,
                  })
                );
              }}
            />
          </EuiFormRow>
        ) : null}

        {column && !incompleteInfo && ParamEditor && (
          <>
            <ParamEditor
              updateLayer={updateLayer}
              currentColumn={column}
              layer={layer}
              layerId={layerId}
              activeData={activeData}
              columnId={columnId}
              indexPattern={currentIndexPattern}
              dateRange={dateRange}
              operationDefinitionMap={operationDefinitionMap}
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
              setIsCloseable={setIsCloseable}
              paramEditorCustomProps={paramEditorCustomProps}
              {...services}
            />
          </>
        )}
      </div>
    </div>
  );
}
