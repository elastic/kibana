/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './field_select.scss';
import { partition } from 'lodash';
import React, { useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
  EuiComboBoxProps,
} from '@elastic/eui';
import classNames from 'classnames';
import { LensFieldIcon } from '../lens_field_icon';
import { trackUiEvent } from '../../lens_ui_telemetry';
import { fieldExists } from '../pure_helpers';
import { TruncatedLabel } from './truncated_label';
import type { OperationType } from '../indexpattern';
import type { DataType } from '../../types';
import type { OperationSupportMatrix } from './operation_support';
import type { IndexPattern, IndexPatternPrivateState } from '../types';
export interface FieldChoice {
  type: 'field';
  field: string;
  operationType: OperationType;
}

export interface FieldSelectProps extends EuiComboBoxProps<EuiComboBoxOptionOption['value']> {
  currentIndexPattern: IndexPattern;
  selectedOperationType?: OperationType;
  selectedField?: string;
  incompleteOperation?: OperationType;
  operationByField: OperationSupportMatrix['operationByField'];
  onChoose: (choice: FieldChoice) => void;
  onDeleteColumn?: () => void;
  existingFields: IndexPatternPrivateState['existingFields'];
  fieldIsInvalid: boolean;
  markAllFieldsCompatible?: boolean;
  'data-test-subj'?: string;
}

const DEFAULT_COMBOBOX_WIDTH = 305;
const COMBOBOX_PADDINGS = 90;
const DEFAULT_FONT = '14px Inter';

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

    const containsData = (field: string) =>
      currentIndexPattern.getFieldByName(field)?.type === 'document' ||
      fieldExists(existingFields, currentIndexPattern.title, field);

    function fieldNamesToOptions(items: string[]) {
      return items
        .filter((field) => currentIndexPattern.getFieldByName(field)?.displayName)
        .map((field) => {
          const compatible =
            markAllFieldsCompatible || isCompatibleWithCurrentOperation(field) ? 1 : 0;
          const exists = containsData(field);
          return {
            label: currentIndexPattern.getFieldByName(field)?.displayName,
            value: {
              type: 'field',
              field,
              dataType: currentIndexPattern.getFieldByName(field)?.type,
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
            className: classNames({
              'lnFieldSelect__option--incompatible': !compatible,
              'lnFieldSelect__option--nonExistant': !exists,
            }),
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
  const comboBoxRef = useRef<HTMLInputElement>(null);
  const [labelProps, setLabelProps] = React.useState<{
    width: number;
    font: string;
  }>({
    width: DEFAULT_COMBOBOX_WIDTH - COMBOBOX_PADDINGS,
    font: DEFAULT_FONT,
  });

  const computeStyles = (_e: UIEvent | undefined, shouldRecomputeAll = false) => {
    if (comboBoxRef.current) {
      const current = {
        ...labelProps,
        width: comboBoxRef.current?.clientWidth - COMBOBOX_PADDINGS,
      };
      if (shouldRecomputeAll) {
        current.font = window.getComputedStyle(comboBoxRef.current).font;
      }
      setLabelProps(current);
    }
  };

  useEffectOnce(() => {
    if (comboBoxRef.current) {
      computeStyles(undefined, true);
    }
    window.addEventListener('resize', computeStyles);
  });

  return (
    <div ref={comboBoxRef}>
      <EuiComboBox
        fullWidth
        compressed
        isClearable={false}
        data-test-subj={dataTestSub ?? 'indexPattern-dimension-field'}
        placeholder={i18n.translate('xpack.lens.indexPattern.fieldPlaceholder', {
          defaultMessage: 'Field',
        })}
        options={memoizedFieldOptions as unknown as EuiComboBoxOptionOption[]}
        isInvalid={Boolean(incompleteOperation || fieldIsInvalid)}
        selectedOptions={
          (selectedOperationType && selectedField
            ? [
                {
                  label: fieldIsInvalid
                    ? selectedField
                    : currentIndexPattern.getFieldByName(selectedField)?.displayName ??
                      selectedField,
                  value: { type: 'field', field: selectedField },
                },
              ]
            : []) as unknown as EuiComboBoxOptionOption[]
        }
        singleSelection={{ asPlainText: true }}
        onChange={(choices) => {
          if (choices.length === 0) {
            onDeleteColumn?.();
            return;
          }

          const choice = choices[0].value as unknown as FieldChoice;

          if (choice.field !== selectedField) {
            trackUiEvent('indexpattern_dimension_field_changed');
            onChoose(choice);
          }
        }}
        renderOption={(option, searchValue) => {
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={null}>
                <LensFieldIcon
                  type={(option.value as unknown as { dataType: DataType }).dataType}
                  fill="none"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <TruncatedLabel {...labelProps} label={option.label} search={searchValue} />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
        {...rest}
      />
    </div>
  );
}
