/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEqual } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { v4 as uuidv4 } from 'uuid';
import type { ListCustomFieldOption } from '../../../../../common/types/domain';
import * as i18n from '../../translations';

interface Props {
  field: FieldHook<ListCustomFieldOption[]>;
  idAria?: string;
  [key: string]: unknown;
  maxOptions?: number;
}

type OptionsFieldOption = ListCustomFieldOption & { isFresh?: boolean };

export const INITIAL_OPTIONS = [
  {
    // Key used to identify the initial default option
    // String literal 'default' is not used to avoid confusion in case the user changes the
    // default value to a different option,
    key: '00000000-0000-0000-0000-000000000000',
    label: '',
  },
];

const OptionsFieldComponent = ({ field, idAria, maxOptions, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  // Add a state to track if an option has just been created. This is used to auto-focus the input, and to prevent
  // any validation errors from appearing until after the user has entered a value or blurred the input
  const [freshOption, setFreshOption] = useState<OptionsFieldOption | null>(null);

  const currentOptions: OptionsFieldOption[] = useMemo(() => {
    const parsedValue = field.value || INITIAL_OPTIONS;
    if (freshOption) parsedValue.push(freshOption);
    return Array.isArray(parsedValue) ? parsedValue : INITIAL_OPTIONS;
  }, [field.value, freshOption]);

  useEffectOnce(() => {
    if (!isEqual(currentOptions, INITIAL_OPTIONS)) {
      field.setValue(currentOptions);
    }
  });

  const onChangeOptionLabel = useCallback(
    ({ key, label }: OptionsFieldOption) => {
      setFreshOption(null);
      const newOptions = currentOptions.map((option) =>
        key === option.key ? { key, label } : option
      );
      field.setValue(newOptions);
    },
    [currentOptions, field]
  );

  const onAddOption = useCallback(() => {
    if (maxOptions && currentOptions.length >= maxOptions) return;
    const newOption = { key: uuidv4(), label: '', isFresh: true };
    setFreshOption(newOption);
  }, [maxOptions, currentOptions]);

  const onRemoveOption = useCallback(
    (key: string) => {
      const newOptions = currentOptions.filter((option) => option.key !== key);
      field.setValue(newOptions);
    },
    [currentOptions, field]
  );

  const onBlurOption = useCallback(
    (option: OptionsFieldOption) => {
      if (option.isFresh) {
        onChangeOptionLabel(option);
      }
    },
    [onChangeOptionLabel]
  );

  const onDragEnd = useCallback<OnDragEndResponder>(
    ({ source, destination }) => {
      if (source && destination) {
        setFreshOption(null);
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
                key={`option-${option.key}`}
                draggableId={`option-${option.key}`}
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
                          autoFocus={option.isFresh}
                          fullWidth
                          value={option.label as string}
                          placeholder={i18n.LIST_OPTION_PLACEHOLDER_TEXT}
                          onChange={(e) =>
                            onChangeOptionLabel({ key: option.key, label: e.target.value })
                          }
                          onBlur={() => onBlurOption(option)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onBlurOption(option);
                              onAddOption();
                            }
                          }}
                          data-test-subj={`options-field-option-label-${index}`}
                        />
                      </EuiFlexItem>
                      {currentOptions.length > 1 && (
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            iconType={'minusInCircle'}
                            color={'danger'}
                            onClick={() => onRemoveOption(option.key)}
                            data-test-subj={`options-field-remove-option-${index}`}
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
        {(!maxOptions || currentOptions.length < maxOptions) && (
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButtonEmpty
                iconType={'plusInCircle'}
                onClick={onAddOption}
                data-test-subj="options-field-add-option"
              >
                {i18n.ADD_LIST_OPTION}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </EuiFormRow>
  );
};

OptionsFieldComponent.displayName = 'OptionsField';

export const OptionsField = React.memo(OptionsFieldComponent);
