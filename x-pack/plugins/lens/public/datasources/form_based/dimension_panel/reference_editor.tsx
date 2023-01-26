/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_editor.scss';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRowProps, EuiSpacer, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { IUiSettingsClient, SavedObjectsClientContract, HttpSetup } from '@kbn/core/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DateRange } from '../../../../common';
import type { OperationSupportMatrix } from './operation_support';
import type { GenericIndexPatternColumn, OperationType } from '../form_based';
import {
  getOperationDisplay,
  isOperationAllowedAsReference,
  FieldBasedIndexPatternColumn,
  RequiredReference,
  IncompleteColumn,
  GenericOperationDefinition,
} from '../operations';
import { FieldChoiceWithOperationType, FieldSelect } from './field_select';
import { hasField } from '../pure_utils';
import type { FormBasedLayer } from '../types';
import type { IndexPattern, IndexPatternField, ParamEditorCustomProps } from '../../../types';
import type { FormBasedDimensionEditorProps } from './dimension_panel';
import { FormRow } from '../operations/definitions/shared_components';

const operationDisplay = getOperationDisplay();

const getFunctionOptions = (
  operationSupportMatrix: OperationSupportMatrix & {
    operationTypes: Set<OperationType>;
  },
  operationDefinitionMap: Record<string, GenericOperationDefinition>,
  column?: GenericIndexPatternColumn
): Array<EuiComboBoxOptionOption<OperationType>> => {
  return Array.from(operationSupportMatrix.operationTypes).map((operationType) => {
    const def = operationDefinitionMap[operationType];
    const label = operationDisplay[operationType].displayName;
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
};

export interface ReferenceEditorProps {
  layer: FormBasedLayer;
  layerId: string;
  activeData?: FormBasedDimensionEditorProps['activeData'];
  selectionStyle: 'full' | 'field' | 'hidden';
  validation: RequiredReference;
  columnId: string;
  column?: GenericIndexPatternColumn;
  incompleteColumn?: IncompleteColumn;
  currentIndexPattern: IndexPattern;
  functionLabel?: string;
  fieldLabel?: string;
  operationDefinitionMap: Record<string, GenericOperationDefinition>;
  isInline?: boolean;
  dateRange: DateRange;
  labelAppend?: EuiFormRowProps['labelAppend'];
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  setIsCloseable: (isCloseable: boolean) => void;
  paramEditorCustomProps?: ParamEditorCustomProps;
  paramEditorUpdater: (
    setter:
      | FormBasedLayer
      | ((prevLayer: FormBasedLayer) => FormBasedLayer)
      | GenericIndexPatternColumn
  ) => void;
  onChooseField: (choice: FieldChoiceWithOperationType) => void;
  onDeleteColumn: () => void;
  onChooseFunction: (operationType: string, field?: IndexPatternField) => void;

  // Services
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  savedObjectsClient: SavedObjectsClientContract;
  http: HttpSetup;
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
}

export const ReferenceEditor = (props: ReferenceEditorProps) => {
  const {
    currentIndexPattern,
    validation,
    selectionStyle,
    labelAppend,
    column,
    incompleteColumn,
    functionLabel,
    onChooseField,
    onDeleteColumn,
    onChooseFunction,
    fieldLabel,
    operationDefinitionMap,
    isInline,
  } = props;

  const selectedOperationDefinition = column && operationDefinitionMap[column.operationType];

  // Basically the operation support matrix, but different validation
  const operationSupportMatrix: OperationSupportMatrix & {
    operationTypes: Set<OperationType>;
  } = useMemo(() => {
    const operationTypes: Set<OperationType> = new Set();
    const operationWithoutField: Set<OperationType> = new Set();
    const operationByField: Partial<Record<string, Set<OperationType>>> = {};
    const fieldByOperation: Partial<Record<OperationType, Set<string>>> = {};
    Object.values(operationDefinitionMap)
      .filter(({ hidden, allowAsReference }) => !hidden && allowAsReference)
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
  }, [currentIndexPattern, validation, operationDefinitionMap]);

  if (selectionStyle === 'hidden') {
    return null;
  }

  const incompleteOperation = incompleteColumn?.operationType;
  const incompleteField = incompleteColumn?.sourceField ?? null;

  const functionOptions = getFunctionOptions(
    operationSupportMatrix,
    operationDefinitionMap,
    column
  );

  const selectedOption = incompleteOperation
    ? [functionOptions?.find(({ value }) => value === incompleteOperation)!]
    : column
    ? [functionOptions?.find(({ value }) => value === column.operationType)!]
    : [];

  // what about a field changing type and becoming invalid?
  // Let's say this change makes the indexpattern without any number field but the operation was set to a numeric operation.
  // At this point the ComboBox will crash.
  // Therefore check if the selectedOption is in functionOptions and in case fill it in as disabled option
  const showSelectionFunctionInvalid = Boolean(selectedOption.length && selectedOption[0] == null);
  if (showSelectionFunctionInvalid) {
    const selectedOperationType = incompleteOperation || column?.operationType;
    const brokenFunctionOption = {
      label: selectedOperationType && operationDisplay[selectedOperationType].displayName,
      value: selectedOperationType,
      className: 'lnsIndexPatternDimensionEditor__operation',
      'data-test-subj': `lns-indexPatternDimension-${selectedOperationType} incompatible`,
    } as EuiComboBoxOptionOption<string>;
    functionOptions?.push(brokenFunctionOption);
    selectedOption[0] = brokenFunctionOption;
  }

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

  const ParamEditor = selectedOperationDefinition?.paramEditor;

  return (
    <div>
      {selectionStyle !== 'field' ? (
        <>
          <FormRow
            isInline={isInline}
            data-test-subj="indexPattern-subFunction-selection-row"
            label={
              functionLabel ||
              i18n.translate('xpack.lens.indexPattern.chooseSubFunction', {
                defaultMessage: 'Choose a sub-function',
              })
            }
            fullWidth
            isInvalid={showOperationInvalid || showSelectionFunctionInvalid}
          >
            <EuiComboBox
              fullWidth
              compressed
              isClearable={false}
              data-test-subj="indexPattern-reference-function"
              placeholder={
                functionLabel ||
                i18n.translate('xpack.lens.indexPattern.referenceFunctionPlaceholder', {
                  defaultMessage: 'Sub-function',
                })
              }
              options={functionOptions}
              isInvalid={showOperationInvalid || showSelectionFunctionInvalid}
              selectedOptions={selectedOption}
              singleSelection={{ asPlainText: true }}
              onChange={(choices: Array<EuiComboBoxOptionOption<string>>) => {
                if (choices.length === 0) {
                  return onDeleteColumn();
                }

                const operationType = choices[0].value!;
                if (column?.operationType === operationType) {
                  return;
                }
                const possibleFieldNames = operationSupportMatrix.fieldByOperation[operationType];

                const field =
                  column && 'sourceField' in column && possibleFieldNames?.has(column.sourceField)
                    ? currentIndexPattern.getFieldByName(column.sourceField)
                    : possibleFieldNames?.size === 1
                    ? currentIndexPattern.getFieldByName(possibleFieldNames.values().next().value)
                    : undefined;

                onChooseFunction(operationType, field);
                return;
              }}
            />
          </FormRow>
          <EuiSpacer size="s" />
        </>
      ) : null}

      {!column || selectedOperationDefinition?.input === 'field' ? (
        <FormRow
          isInline={isInline}
          data-test-subj="indexPattern-reference-field-selection-row"
          label={
            fieldLabel ||
            i18n.translate('xpack.lens.indexPattern.chooseField', {
              defaultMessage: 'Field',
            })
          }
          fullWidth
          isInvalid={showFieldInvalid || showFieldMissingInvalid}
          labelAppend={labelAppend}
        >
          <FieldSelect
            fieldIsInvalid={showFieldInvalid || showFieldMissingInvalid}
            currentIndexPattern={currentIndexPattern}
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
            onDeleteColumn={onDeleteColumn}
            onChoose={onChooseField}
          />
        </FormRow>
      ) : null}

      {column && !incompleteColumn && ParamEditor && (
        <>
          <EuiSpacer size="s" />
          <ParamEditor
            {...props}
            isReferenced={true}
            operationDefinitionMap={operationDefinitionMap}
            currentColumn={column}
            indexPattern={props.currentIndexPattern}
          />
        </>
      )}
    </div>
  );
};
