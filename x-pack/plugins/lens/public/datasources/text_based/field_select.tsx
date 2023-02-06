/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { FieldPicker, FieldOptionValue, FieldOption } from '../../shared_components/field_picker';
import type { TextBasedLayerColumn } from './types';
import type { DataType } from '../../types';

export interface FieldOptionCompatible extends DatatableColumn {
  compatible: boolean;
}

export interface FieldSelectProps extends EuiComboBoxProps<EuiComboBoxOptionOption['value']> {
  selectedField?: TextBasedLayerColumn;
  onChoose: (choice: FieldOptionValue) => void;
  existingFields: FieldOptionCompatible[];
}

export function FieldSelect({
  selectedField,
  onChoose,
  existingFields,
  ['data-test-subj']: dataTestSub,
}: FieldSelectProps) {
  const memoizedFieldOptions = useMemo(() => {
    const availableFields = existingFields
      .map((field) => {
        const dataType = field?.meta?.type as DataType;
        return {
          compatible: field.compatible ? 1 : 0,
          exists: true,
          label: field.name,
          value: {
            type: 'field' as FieldOptionValue['type'],
            field: field.name,
            dataType,
          },
        };
      })
      .sort((a, b) => b.compatible - a.compatible);
    return [
      {
        label: i18n.translate('xpack.lens.indexPattern.availableFieldsLabel', {
          defaultMessage: 'Available fields',
        }),
        options: availableFields,
      },
    ];
  }, [existingFields]);

  return (
    <FieldPicker<FieldOptionValue>
      selectedOptions={
        selectedField
          ? ([
              {
                label: selectedField.fieldName,
                value: {
                  type: 'field',
                  field: selectedField.fieldName,
                  dataType: selectedField?.meta?.type,
                },
              },
            ] as unknown as Array<FieldOption<FieldOptionValue>>)
          : []
      }
      options={memoizedFieldOptions as Array<FieldOption<FieldOptionValue>>}
      onChoose={(choice) => {
        if (choice && choice.field !== selectedField?.fieldName) {
          onChoose(choice);
        }
      }}
      fieldIsInvalid={false}
      data-test-subj={dataTestSub ?? 'text-based-dimension-field'}
    />
  );
}
