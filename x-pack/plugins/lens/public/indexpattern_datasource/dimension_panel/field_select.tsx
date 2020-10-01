/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './field_select.scss';
import _ from 'lodash';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiComboBoxProps,
} from '@elastic/eui';
import classNames from 'classnames';
import { EuiHighlight } from '@elastic/eui';
import { OperationType } from '../indexpattern';
import { LensFieldIcon } from '../lens_field_icon';
import { DataType } from '../../types';
import { OperationSupportMatrix } from './dimension_panel';
import { IndexPattern, IndexPatternField, IndexPatternPrivateState } from '../types';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { fieldExists } from '../pure_helpers';

export interface FieldChoice {
  type: 'field';
  field: string;
  operationType?: OperationType;
}

export interface FieldSelectProps extends EuiComboBoxProps<{}> {
  currentIndexPattern: IndexPattern;
  fieldMap: Record<string, IndexPatternField>;
  incompatibleSelectedOperationType: OperationType | null;
  selectedColumnOperationType?: OperationType;
  selectedColumnSourceField?: string;
  operationSupportMatrix: OperationSupportMatrix;
  onChoose: (choice: FieldChoice) => void;
  onDeleteColumn: () => void;
  existingFields: IndexPatternPrivateState['existingFields'];
  fieldIsInvalid: boolean;
}

export function FieldSelect({
  currentIndexPattern,
  fieldMap,
  incompatibleSelectedOperationType,
  selectedColumnOperationType,
  selectedColumnSourceField,
  operationSupportMatrix,
  onChoose,
  onDeleteColumn,
  existingFields,
  fieldIsInvalid,
  ...rest
}: FieldSelectProps) {
  const { operationByField } = operationSupportMatrix;
  const memoizedFieldOptions = useMemo(() => {
    const fields = Object.keys(operationByField).sort();

    function isCompatibleWithCurrentOperation(fieldName: string) {
      if (incompatibleSelectedOperationType) {
        return operationByField[fieldName]!.includes(incompatibleSelectedOperationType);
      }
      return (
        !selectedColumnOperationType ||
        operationByField[fieldName]!.includes(selectedColumnOperationType)
      );
    }

    const [specialFields, normalFields] = _.partition(
      fields,
      (field) => fieldMap[field].type === 'document'
    );

    const containsData = (field: string) =>
      fieldMap[field].type === 'document' ||
      fieldExists(existingFields, currentIndexPattern.title, field);

    function fieldNamesToOptions(items: string[]) {
      return items
        .map((field) => ({
          label: fieldMap[field].displayName,
          value: {
            type: 'field',
            field,
            dataType: fieldMap[field].type,
            operationType:
              selectedColumnOperationType && isCompatibleWithCurrentOperation(field)
                ? selectedColumnOperationType
                : undefined,
          },
          exists: containsData(field),
          compatible: isCompatibleWithCurrentOperation(field),
        }))
        .sort((a, b) => {
          if (a.compatible && !b.compatible) {
            return -1;
          }
          if (!a.compatible && b.compatible) {
            return 1;
          }
          return 0;
        })
        .map(({ label, value, compatible, exists }) => ({
          label,
          value,
          className: classNames({
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'lnFieldSelect__option--incompatible': !compatible,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'lnFieldSelect__option--nonExistant': !exists,
          }),
          'data-test-subj': `lns-fieldOption${compatible ? '' : 'Incompatible'}-${value.field}`,
        }));
    }

    const [metaFields, nonMetaFields] = _.partition(normalFields, (field) => fieldMap[field].meta);
    const [availableFields, emptyFields] = _.partition(nonMetaFields, containsData);

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
    incompatibleSelectedOperationType,
    selectedColumnOperationType,
    currentIndexPattern,
    fieldMap,
    operationByField,
    existingFields,
  ]);

  return (
    <EuiComboBox
      fullWidth
      compressed
      isClearable={false}
      data-test-subj="indexPattern-dimension-field"
      placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
        defaultMessage: 'Field',
      })}
      options={(memoizedFieldOptions as unknown) as EuiComboBoxOptionOption[]}
      isInvalid={Boolean(incompatibleSelectedOperationType || fieldIsInvalid)}
      selectedOptions={
        ((selectedColumnOperationType && selectedColumnSourceField
          ? [
              {
                label: fieldIsInvalid
                  ? selectedColumnSourceField
                  : fieldMap[selectedColumnSourceField]?.displayName,
                value: { type: 'field', field: selectedColumnSourceField },
              },
            ]
          : []) as unknown) as EuiComboBoxOptionOption[]
      }
      singleSelection={{ asPlainText: true }}
      onChange={(choices) => {
        if (choices.length === 0) {
          onDeleteColumn();
          return;
        }

        trackUiEvent('indexpattern_dimension_field_changed');

        onChoose((choices[0].value as unknown) as FieldChoice);
      }}
      renderOption={(option, searchValue) => {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={null}>
              <LensFieldIcon
                type={((option.value as unknown) as { dataType: DataType }).dataType}
                fill="none"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }}
      {...rest}
    />
  );
}
