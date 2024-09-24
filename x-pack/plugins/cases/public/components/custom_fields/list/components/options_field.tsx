/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  euiDragDropReorder,
} from '@elastic/eui';
import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEqual } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { v4 as uuidv4 } from 'uuid';
import * as i18n from '../../translations';

interface Props {
  field: FieldHook;
  euiFieldProps?: Record<string, unknown>;
  idAria?: string;
  [key: string]: unknown;
}

export const INITIAL_OPTIONS = [
  {
    // Key used to identify the initial default option
    // String literal 'default' is not used to avoid confusion in case the user changes the \
    // default value to a different option,
    value: '00000000-0000-0000-0000-000000000000',
    text: '',
  },
];

// eslint-disable-next-line react/display-name
export const OptionsField = ({ field, euiFieldProps = {}, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  const currentOptions: EuiSelectOption[] = useMemo(() => {
    const parsedValue = field.value ?? INITIAL_OPTIONS;
    return Array.isArray(parsedValue) ? parsedValue : INITIAL_OPTIONS;
  }, [field.value]);

  useEffectOnce(() => {
    if (!isEqual(currentOptions, INITIAL_OPTIONS)) {
      field.setValue(currentOptions);
    }
  });

  const onChangeOptionLabel = useCallback(
    ({ value, text }) => {
      const newOptions = currentOptions.map((option) =>
        value === option.value ? { ...option, text } : option
      );
      field.setValue(newOptions);
    },
    [currentOptions, field]
  );

  const onAddOption = useCallback(() => {
    const newOptions = [...currentOptions, { value: uuidv4(), text: '' }];
    field.setValue(newOptions);
  }, [currentOptions, field]);

  const onRemoveOption = useCallback(
    (value) => {
      const newOptions = currentOptions.filter((option) => option.value !== value);
      field.setValue(newOptions);
    },
    [currentOptions, field]
  );

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const newOptions = euiDragDropReorder(currentOptions, source.index, destination.index);
        field.setValue(newOptions);
      }
    },
    [currentOptions, field]
  );

  return (
    <EuiFormRow
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      label={field.label}
      {...rest}
    >
      <EuiPanel color="subdued" paddingSize="s">
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="OPTIONS_DROPPABLE_AREA" spacing="m">
            {currentOptions.map((option, index) => (
              <EuiDraggable
                spacing="m"
                key={`option-${option.value}`}
                draggableId={`option-${option.value}`}
                index={index}
                customDragHandle
                hasInteractiveChildren
              >
                {(provided) => (
                  <EuiPanel key={index} paddingSize="s">
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiPanel
                          color="transparent"
                          paddingSize="s"
                          {...provided.dragHandleProps}
                          aria-label="Drag Handle"
                        >
                          <EuiIcon type="grab" />
                        </EuiPanel>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiFieldText
                          fullWidth
                          value={option.text as string}
                          placeholder={i18n.LIST_OPTION_PLACEHOLDER_TEXT}
                          onChange={(e) =>
                            onChangeOptionLabel({ value: option.value, text: e.target.value })
                          }
                        />
                      </EuiFlexItem>
                      {currentOptions.length > 1 && (
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            iconType={'minusInCircle'}
                            color={'danger'}
                            onClick={() => onRemoveOption(option.value)}
                          />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiPanel>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
        <EuiButtonEmpty iconType={'plusInCircle'} onClick={onAddOption}>
          {i18n.ADD_LIST_OPTION}
        </EuiButtonEmpty>
      </EuiPanel>
    </EuiFormRow>
  );
};
