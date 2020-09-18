/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EuiPanel,
  EuiSpacer,
  EuiFieldText,
  EuiIconTip,
} from '@elastic/eui';

import {
  UseField,
  ArrayItem,
  ValidationFunc,
  getFieldValidityAndErrorMessage,
} from '../../../../../../shared_imports';

import './drag_and_drop_text_list.scss';

interface Props {
  value: ArrayItem[];
  onMove: (sourceIdx: number, destinationIdx: number) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  addLabel: string;
  /**
   * Validation to be applied to every text item
   */
  textValidation?: ValidationFunc<any, string, string>;
}

const i18nTexts = {
  removeItemButtonAriaLabel: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.dragAndDropList.removeItemLabel',
    { defaultMessage: 'Remove item' }
  ),
};

function DragAndDropTextListComponent({
  value,
  onMove,
  onAdd,
  onRemove,
  addLabel,
  textValidation,
}: Props): JSX.Element {
  const [droppableId] = useState(() => uuid.v4());

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        onMove(source.index, destination.index);
      }
    },
    [onMove]
  );
  return (
    <EuiPanel
      className="pipelineProcessorsEditor__form__dragAndDropList__panel"
      hasShadow={false}
      paddingSize="s"
    >
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
                            validations: textValidation
                              ? [{ validator: textValidation }]
                              : undefined,
                          }}
                          readDefaultValueOnForm={!item.isNew}
                        >
                          {(field) => {
                            const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(
                              field
                            );
                            return (
                              <EuiFlexGroup gutterSize="none" alignItems="center">
                                <EuiFlexItem>
                                  <EuiFieldText
                                    isInvalid={isInvalid}
                                    value={field.value}
                                    onChange={field.onChange}
                                    compressed
                                    fullWidth
                                  />
                                </EuiFlexItem>
                                {typeof errorMessage === 'string' && (
                                  <EuiFlexItem grow={false}>
                                    <div className="pipelineProcessorsEditor__form__dragAndDropList__errorIcon">
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
      {value.length ? <EuiSpacer size="s" /> : null}
      <EuiButtonEmpty iconType="plusInCircle" onClick={onAdd}>
        {addLabel}
      </EuiButtonEmpty>
    </EuiPanel>
  );
}

export const DragAndDropTextList = memo(
  DragAndDropTextListComponent
) as typeof DragAndDropTextListComponent;
