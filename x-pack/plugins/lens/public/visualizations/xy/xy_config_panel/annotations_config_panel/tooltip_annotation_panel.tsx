/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  htmlIdGenerator,
  EuiButton,
  EuiButtonIcon,
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import { QueryPointEventAnnotationConfig } from '@kbn/event-annotation-plugin/common';
import type { ExistingFieldsMap, IndexPattern } from '../../../../types';
import {
  fieldExists,
  FieldOption,
  FieldOptionValue,
  FieldPicker,
  useDebouncedValue,
  NewBucketButton,
  DragDropBuckets,
} from '../../../../shared_components';

const generateId = htmlIdGenerator();
const supportedTypes = new Set(['string', 'boolean', 'number', 'ip', 'date']);

export interface FieldInputsProps {
  currentConfig: QueryPointEventAnnotationConfig;
  setConfig: (config: QueryPointEventAnnotationConfig) => void;
  indexPattern: IndexPattern;
  existingFields: ExistingFieldsMap;
  invalidFields?: string[];
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

export function TooltipSection({
  currentConfig,
  setConfig,
  indexPattern,
  existingFields,
  invalidFields,
}: FieldInputsProps) {
  const onChangeWrapped = useCallback(
    (values: WrappedValue[]) => {
      setConfig({
        ...currentConfig,
        extraFields: values.filter(removeNewEmptyField).map(({ value }) => value),
      });
    },
    [setConfig, currentConfig]
  );
  const { wrappedValues, rawValuesLookup } = useMemo(() => {
    const rawValues = currentConfig.extraFields ?? [];
    return {
      wrappedValues: rawValues.map((value) => ({ id: generateId(), value })),
      rawValuesLookup: new Set(rawValues),
    };
  }, [currentConfig]);

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

  const newBucketButton = (
    <NewBucketButton
      data-test-subj={`lnsXY-annotation-tooltip-add_field`}
      onClick={() => {
        handleInputChange([...localValues, { id: generateId(), value: undefined, isNew: true }]);
      }}
      label={i18n.translate('xpack.lens.xyChart.annotation.tooltip.addField', {
        defaultMessage: 'Add field',
      })}
    />
  );

  if (localValues.length === 0) {
    return (
      <>
        <EuiFlexItem grow={true}>
          <EuiButton isDisabled fullWidth onClick={() => {}}>
            {i18n.translate('xpack.lens.xyChart.annotation.tooltip.noFields', {
              defaultMessage: 'None selected',
            })}
          </EuiButton>
        </EuiFlexItem>
        {newBucketButton}
      </>
    );
  }
  const currentExistingField = existingFields[indexPattern.title];
  const disableActions = localValues.length === 2 && localValues.some(({ isNew }) => isNew);
  const options = indexPattern.fields
    .filter(
      ({ displayName, type }) =>
        displayName && !rawValuesLookup.has(displayName) && supportedTypes.has(type)
    )
    .map(
      (field) =>
        ({
          label: field.displayName,
          value: {
            type: 'field',
            field: field.name,
            dataType: field.type,
          },
          exists: fieldExists(currentExistingField, field.name),
          compatible: true,
          'data-test-subj': `lnsXY-annotation-tooltip-fieldOption-${field.name}`,
        } as FieldOption<FieldOptionValue>)
    )
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <DragDropBuckets
        onDragEnd={(updatedValues: WrappedValue[]) => {
          handleInputChange(updatedValues);
        }}
        onDragStart={() => {}}
        droppableId="ANNOTATION_TOOLTIP_DROPPABLE_AREA"
        items={localValues}
      >
        {localValues.map(({ id, value, isNew }, index) => {
          const fieldIsValid = value ? Boolean(indexPattern.getFieldByName(value)) : true;
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
                      title={i18n.translate(
                        'xpack.lens.xyChart.annotation..tooltip.dragToReorder',
                        {
                          defaultMessage: 'Drag to reorder',
                        }
                      )}
                      data-test-subj={`lnsXY-annotation-tooltip-dragToReorder-${index}`}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={true} style={{ minWidth: 0 }}>
                    <FieldPicker
                      selectedOptions={
                        value
                          ? [
                              {
                                label: value,
                                value: { type: 'field', field: value },
                              },
                            ]
                          : []
                      }
                      options={options}
                      onChoose={function (choice: FieldOptionValue | undefined): void {
                        onFieldSelectChange(choice, index);
                      }}
                      fieldIsInvalid={!fieldIsValid}
                      autoFocus={isNew && value == null}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
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
                      data-test-subj={`lnsXY-annotation-tooltip-removeField-${index}`}
                      isDisabled={disableActions && !isNew}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiDraggable>
          );
        })}
      </DragDropBuckets>
      {newBucketButton}
    </>
  );
}
