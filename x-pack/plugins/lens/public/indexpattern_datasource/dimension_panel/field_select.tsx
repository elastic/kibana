/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_select.scss';
import { partition } from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import type { OperationType } from '../indexpattern';
import type { OperationSupportMatrix } from './operation_support';
import { FieldOption, FieldOptionValue, FieldPicker } from '../../shared_components/field_picker';
import { fieldContainsData } from '../../shared_components';
import type { ExistingFieldsMap, IndexPattern } from '../../types';
import { getFieldType } from '../pure_utils';

export type FieldChoiceWithOperationType = FieldOptionValue & {
  operationType: OperationType;
};

export interface FieldSelectProps extends EuiComboBoxProps<EuiComboBoxOptionOption['value']> {
  currentIndexPattern: IndexPattern;
  selectedOperationType?: OperationType;
  selectedField?: string;
  incompleteOperation?: OperationType;
  operationByField: OperationSupportMatrix['operationByField'];
  onChoose: (choice: FieldChoiceWithOperationType) => void;
  onDeleteColumn?: () => void;
  existingFields: ExistingFieldsMap[string];
  fieldIsInvalid: boolean;
  markAllFieldsCompatible?: boolean;
  'data-test-subj'?: string;
}

export function FieldSelect({
  currentIndexPattern,
  incompleteOperation,
  selectedOperationType,
  selectedField,
  operationByField,
  onChoose,
  onDeleteColumn,
  existingFields,
  fieldIsInvalid,
  markAllFieldsCompatible,
  ['data-test-subj']: dataTestSub,
  ...rest
}: FieldSelectProps) {
  const memoizedFieldOptions = useMemo(() => {
    const fields = Object.keys(operationByField).sort();

    const currentOperationType = incompleteOperation ?? selectedOperationType;

    function isCompatibleWithCurrentOperation(fieldName: string) {
      return !currentOperationType || operationByField[fieldName]!.has(currentOperationType);
    }

    const [specialFields, normalFields] = partition(
      fields,
      (field) => currentIndexPattern.getFieldByName(field)?.type === 'document'
    );

    function containsData(field: string) {
      return fieldContainsData(field, currentIndexPattern, existingFields);
    }

    function fieldNamesToOptions(items: string[]) {
      return items
        .filter((field) => currentIndexPattern.getFieldByName(field)?.displayName)
        .map((field) => {
          const compatible =
            markAllFieldsCompatible || isCompatibleWithCurrentOperation(field) ? 1 : 0;
          const exists = containsData(field);
          const fieldInstance = currentIndexPattern.getFieldByName(field);
          return {
            label: currentIndexPattern.getFieldByName(field)?.displayName,
            value: {
              type: 'field',
              field,
              dataType: fieldInstance ? getFieldType(fieldInstance) : undefined,
              // Use the operation directly, or choose the first compatible operation.
              // All fields are guaranteed to have at least one operation because they
              // won't appear in the list otherwise
              operationType:
                currentOperationType && isCompatibleWithCurrentOperation(field)
                  ? currentOperationType
                  : operationByField[field]!.values().next().value,
            },
            exists,
            compatible,
            'data-test-subj': `lns-fieldOption${compatible ? '' : 'Incompatible'}-${field}`,
          };
        })
        .sort((a, b) => b.compatible - a.compatible);
    }

    const [metaFields, nonMetaFields] = partition(
      normalFields,
      (field) => currentIndexPattern.getFieldByName(field)?.meta
    );
    const [availableFields, emptyFields] = partition(nonMetaFields, containsData);

    const constructFieldsOptions = (fieldsArr: string[], label: string) =>
      fieldsArr.length > 0 && {
        label,
        options: fieldNamesToOptions(fieldsArr),
      };

    const availableFieldsOptions = constructFieldsOptions(
      availableFields,
      i18n.translate('xpack.lens.indexPattern.availableFieldsLabel', {
        defaultMessage: 'Available fields',
      })
    );

    const emptyFieldsOptions = constructFieldsOptions(
      emptyFields,
      i18n.translate('xpack.lens.indexPattern.emptyFieldsLabel', {
        defaultMessage: 'Empty fields',
      })
    );

    const metaFieldsOptions = constructFieldsOptions(
      metaFields,
      i18n.translate('xpack.lens.indexPattern.metaFieldsLabel', {
        defaultMessage: 'Meta fields',
      })
    );

    return [
      ...fieldNamesToOptions(specialFields),
      availableFieldsOptions,
      emptyFieldsOptions,
      metaFieldsOptions,
    ].filter(Boolean);
  }, [
    incompleteOperation,
    selectedOperationType,
    currentIndexPattern,
    operationByField,
    existingFields,
    markAllFieldsCompatible,
  ]);

  return (
    <FieldPicker<FieldChoiceWithOperationType>
      selectedOptions={
        (selectedOperationType && selectedField
          ? [
              {
                label:
                  (selectedOperationType &&
                    selectedField &&
                    currentIndexPattern.getFieldByName(selectedField)?.displayName) ??
                  selectedField,
                value: { type: 'field', field: selectedField },
              },
            ]
          : []) as unknown as Array<FieldOption<FieldChoiceWithOperationType>>
      }
      options={memoizedFieldOptions as Array<FieldOption<FieldChoiceWithOperationType>>}
      onChoose={(choice) => {
        if (choice && choice.field !== selectedField) {
          onChoose(choice);
        }
      }}
      onDelete={onDeleteColumn}
      fieldIsInvalid={Boolean(incompleteOperation || fieldIsInvalid)}
      data-test-subj={dataTestSub ?? 'indexPattern-dimension-field'}
    />
  );
}
