/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  htmlIdGenerator,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DragDropBuckets, NewBucketButton } from '../shared_components/buckets';
import { TooltipWrapper, useDebouncedValue } from '../../../../shared_components';
import { FieldSelect } from '../../../dimension_panel/field_select';
import type { TermsIndexPatternColumn } from './types';
import type { IndexPattern, IndexPatternPrivateState } from '../../../types';
import type { OperationSupportMatrix } from '../../../dimension_panel';
import { supportedTypes } from './constants';

const generateId = htmlIdGenerator();
export const MAX_MULTI_FIELDS_SIZE = 3;

export interface FieldInputsProps {
  column: TermsIndexPatternColumn;
  indexPattern: IndexPattern;
  existingFields: IndexPatternPrivateState['existingFields'];
  invalidFields?: string[];
  operationSupportMatrix: Pick<OperationSupportMatrix, 'operationByField'>;
  onChange: (newValues: string[]) => void;
}

interface WrappedValue {
  id: string;
  value: string | undefined;
  isNew?: boolean;
}

type SafeWrappedValue = Omit<WrappedValue, 'value'> & { value: string };

function removeNewEmptyField(v: WrappedValue): v is SafeWrappedValue {
  return v.value != null;
}

export function FieldInputs({
  column,
  onChange,
  indexPattern,
  existingFields,
  operationSupportMatrix,
  invalidFields,
}: FieldInputsProps) {
  const onChangeWrapped = useCallback(
    (values: WrappedValue[]) =>
      onChange(values.filter(removeNewEmptyField).map(({ value }) => value)),
    [onChange]
  );
  const { wrappedValues, rawValuesLookup } = useMemo(() => {
    const rawValues = column ? [column.sourceField, ...(column.params?.secondaryFields || [])] : [];
    return {
      wrappedValues: rawValues.map((value) => ({ id: generateId(), value })),
      rawValuesLookup: new Set(rawValues),
    };
  }, [column]);

  const { inputValue: localValues, handleInputChange } = useDebouncedValue<WrappedValue[]>({
    onChange: onChangeWrapped,
    value: wrappedValues,
  });

  const onFieldSelectChange = useCallback(
    (choice, index = 0) => {
      const fields = [...localValues];

      if (indexPattern.getFieldByName(choice.field)) {
        fields[index] = { id: generateId(), value: choice.field };

        // update the layer state
        handleInputChange(fields);
      }
    },
    [localValues, indexPattern, handleInputChange]
  );

  // diminish attention to adding fields alternative
  if (localValues.length === 1) {
    const [{ value }] = localValues;
    return (
      <>
        <FieldSelect
          fieldIsInvalid={Boolean(invalidFields?.[0])}
          currentIndexPattern={indexPattern}
          existingFields={existingFields}
          operationByField={operationSupportMatrix.operationByField}
          selectedOperationType={column?.operationType}
          selectedField={value}
          onChoose={onFieldSelectChange}
        />
        <NewBucketButton
          data-test-subj={`indexPattern-terms-add-field`}
          onClick={() => {
            handleInputChange([
              ...localValues,
              { id: generateId(), value: undefined, isNew: true },
            ]);
          }}
          label={i18n.translate('xpack.lens.indexPattern.terms.addField', {
            defaultMessage: 'Add field',
          })}
          isDisabled={column.params.orderBy.type === 'rare'}
        />
      </>
    );
  }
  const disableActions = localValues.length === 2 && localValues.some(({ isNew }) => isNew);
  const localValuesFilled = localValues.filter(({ isNew }) => !isNew);
  return (
    <>
      <DragDropBuckets
        onDragEnd={(updatedValues: WrappedValue[]) => {
          handleInputChange(updatedValues);
        }}
        onDragStart={() => {}}
        droppableId="TOP_TERMS_DROPPABLE_AREA"
        items={localValues}
      >
        {localValues.map(({ id, value, isNew }, index) => {
          // need to filter the available fields for multiple terms
          // * a scripted field should be removed
          // * a field of unsupported type should be removed
          // * a field that has been used
          // * a scripted field was used in a singular term, should be marked as invalid for multi-terms
          const filteredOperationByField = Object.keys(operationSupportMatrix.operationByField)
            .filter((key) => {
              if (key === value) {
                return true;
              }
              const field = indexPattern.getFieldByName(key);
              return (
                !rawValuesLookup.has(key) &&
                field &&
                !field.scripted &&
                supportedTypes.has(field.type)
              );
            })
            .reduce<OperationSupportMatrix['operationByField']>((memo, key) => {
              memo[key] = operationSupportMatrix.operationByField[key];
              return memo;
            }, {});

          const shouldShowError = Boolean(
            value &&
              ((indexPattern.getFieldByName(value)?.scripted && localValuesFilled.length > 1) ||
                invalidFields?.includes(value))
          );
          return (
            <EuiDraggable
              style={{ marginBottom: 4 }}
              spacing="none"
              index={index}
              draggableId={value || 'newField'}
              key={id}
              disableInteractiveElementBlocking
            >
              {(provided) => (
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      size="s"
                      color="subdued"
                      type="grab"
                      title={i18n.translate('xpack.lens.indexPattern.terms.dragToReorder', {
                        defaultMessage: 'Drag to reorder',
                      })}
                      data-test-subj={`indexPattern-terms-dragToReorder-${index}`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                    <FieldSelect
                      fieldIsInvalid={shouldShowError}
                      currentIndexPattern={indexPattern}
                      existingFields={existingFields}
                      operationByField={filteredOperationByField}
                      selectedOperationType={column.operationType}
                      selectedField={value}
                      autoFocus={isNew}
                      onChoose={(choice) => {
                        onFieldSelectChange(choice, index);
                      }}
                      isInvalid={shouldShowError}
                      data-test-subj={`indexPattern-dimension-field-${index}`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <TooltipWrapper
                      tooltipContent={i18n.translate(
                        'xpack.lens.indexPattern.terms.deleteButtonDisabled',
                        {
                          defaultMessage: 'This function requires a minimum of one field defined',
                        }
                      )}
                      condition={disableActions}
                    >
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        aria-label={i18n.translate(
                          'xpack.lens.indexPattern.terms.deleteButtonAriaLabel',
                          {
                            defaultMessage: 'Delete',
                          }
                        )}
                        title={i18n.translate('xpack.lens.indexPattern.terms.deleteButtonLabel', {
                          defaultMessage: 'Delete',
                        })}
                        onClick={() => {
                          handleInputChange(localValues.filter((_, i) => i !== index));
                        }}
                        data-test-subj={`indexPattern-terms-removeField-${index}`}
                        isDisabled={disableActions && !isNew}
                      />
                    </TooltipWrapper>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiDraggable>
          );
        })}
      </DragDropBuckets>
      <NewBucketButton
        onClick={() => {
          handleInputChange([...localValues, { id: generateId(), value: undefined, isNew: true }]);
        }}
        data-test-subj={`indexPattern-terms-add-field`}
        label={i18n.translate('xpack.lens.indexPattern.terms.addaFilter', {
          defaultMessage: 'Add field',
        })}
        isDisabled={localValues.length > MAX_MULTI_FIELDS_SIZE}
      />
    </>
  );
}

export function getInputFieldErrorMessage(isScriptedField: boolean, invalidFields: string[]) {
  if (isScriptedField) {
    return i18n.translate('xpack.lens.indexPattern.terms.scriptedFieldErrorShort', {
      defaultMessage: 'Scripted fields are not supported when using multiple fields',
    });
  }
  if (invalidFields.length) {
    return i18n.translate('xpack.lens.indexPattern.terms.invalidFieldsErrorShort', {
      defaultMessage:
        'Invalid {invalidFieldsCount, plural, one {field} other {fields}}: {invalidFields}. Check your data view or pick another field.',
      values: {
        invalidFieldsCount: invalidFields.length,
        invalidFields: invalidFields.map((fieldName) => `"${fieldName}"`).join(', '),
      },
    });
  }
}
