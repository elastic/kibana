/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, memo } from 'react';
import uuid from 'uuid';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiFieldText,
  EuiIconTip,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import {
  UseField,
  ArrayItem,
  ValidationFunc,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import './drag_and_drop_text_list.scss';

interface Props {
  label: string;
  helpText: React.ReactNode;
  error: string | null;
  value: ArrayItem[];
  onMove: (sourceIdx: number, destinationIdx: number) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  addLabel: string;
  /**
   * Validation to be applied to every text item
   */
  textValidations?: Array<ValidationFunc<any, string, string>>;
  /**
   * Serializer to be applied to every text item
   */
  textSerializer?: <O = string>(v: string) => O;
  /**
   * Deserializer to be applied to every text item
   */
  textDeserializer?: (v: unknown) => string;
}

const i18nTexts = {
  removeItemButtonAriaLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.dragAndDropList.removeItemLabel',
    { defaultMessage: 'Remove item' }
  ),
};

function DragAndDropTextListComponent({
  label,
  helpText,
  error,
  value,
  onMove,
  onAdd,
  onRemove,
  addLabel,
  textValidations,
  textDeserializer,
  textSerializer,
}: Props): JSX.Element {
  const [droppableId] = useState(() => uuid.v4());
  const [firstItemId] = useState(() => uuid.v4());

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        onMove(source.index, destination.index);
      }
    },
    [onMove]
  );
  return (
    <EuiFormRow
      isInvalid={typeof error === 'string'}
      error={error}
      fullWidth
      data-test-subj="droppableList"
    >
      <>
        {/* Label and help text. Also wire up the htmlFor so the label points to the first text field. */}
        <EuiFlexGroup
          className="pipelineProcessorsEditor__form__dragAndDropList__labelContainer"
          justifyContent="flexStart"
          direction="column"
          gutterSize="none"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs">
              <label htmlFor={firstItemId}>
                <strong>{label}</strong>
              </label>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <p>{helpText}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* The processor panel */}
        <div className="pipelineProcessorsEditor__form__dragAndDropList__panel">
          <EuiDragDropContext onDragEnd={onDragEnd}>
            <EuiDroppable droppableId={droppableId}>
              {value.map((item, idx) => {
                return (
                  <EuiDraggable
                    customDragHandle
                    spacing="none"
                    draggableId={String(item.id)}
                    index={idx}
                    key={item.id}
                  >
                    {(provided) => {
                      return (
                        <EuiFlexGroup
                          className="pipelineProcessorsEditor__form__dragAndDropList__item"
                          justifyContent="center"
                          alignItems="center"
                          gutterSize="none"
                        >
                          <EuiFlexItem grow={false}>
                            <div {...provided.dragHandleProps}>
                              <EuiIcon
                                className="pipelineProcessorsEditor__form__dragAndDropList__grabIcon"
                                type="grab"
                              />
                            </div>
                          </EuiFlexItem>
                          <EuiFlexItem>
                            <UseField<string>
                              path={item.path}
                              config={{
                                validations: textValidations
                                  ? textValidations.map((validator) => ({ validator }))
                                  : undefined,
                                deserializer: textDeserializer,
                                serializer: textSerializer,
                              }}
                              readDefaultValueOnForm={!item.isNew}
                            >
                              {(field) => {
                                const { isInvalid, errorMessage } =
                                  getFieldValidityAndErrorMessage(field);
                                return (
                                  <EuiFlexGroup gutterSize="none" alignItems="center">
                                    <EuiFlexItem>
                                      <EuiFieldText
                                        data-test-subj={`input-${idx}`}
                                        id={idx === 0 ? firstItemId : undefined}
                                        isInvalid={isInvalid}
                                        value={field.value}
                                        onChange={field.onChange}
                                        compressed
                                        fullWidth
                                      />
                                    </EuiFlexItem>
                                    {typeof errorMessage === 'string' && (
                                      <EuiFlexItem grow={false}>
                                        <div
                                          className="pipelineProcessorsEditor__form__dragAndDropList__errorIcon"
                                          data-test-subj="errorIcon"
                                        >
                                          <EuiIconTip
                                            aria-label={errorMessage}
                                            content={errorMessage}
                                            type="alert"
                                            color="danger"
                                          />
                                        </div>
                                      </EuiFlexItem>
                                    )}
                                  </EuiFlexGroup>
                                );
                              }}
                            </UseField>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            {value.length > 1 ? (
                              <EuiButtonIcon
                                aria-label={i18nTexts.removeItemButtonAriaLabel}
                                className="pipelineProcessorsEditor__form__dragAndDropList__removeButton"
                                iconType="minusInCircle"
                                color="danger"
                                onClick={() => onRemove(item.id)}
                              />
                            ) : (
                              // Render a no-op placeholder button
                              <EuiIcon
                                className="pipelineProcessorsEditor__form__dragAndDropList__removeButton"
                                type="empty"
                              />
                            )}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      );
                    }}
                  </EuiDraggable>
                );
              })}
            </EuiDroppable>
          </EuiDragDropContext>
          <EuiButtonEmpty iconType="plusInCircle" onClick={onAdd} data-test-subj="addButton">
            {addLabel}
          </EuiButtonEmpty>
        </div>
      </>
    </EuiFormRow>
  );
}

export const DragAndDropTextList = memo(
  DragAndDropTextListComponent
) as typeof DragAndDropTextListComponent;
