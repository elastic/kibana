/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, memo } from 'react';
import uuid from 'uuid';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';

import { UseField, ArrayItem } from '../../../../../../shared_imports';

import './drag_and_drop_text_list.scss';

interface Props {
  value: ArrayItem[];
  onMove: (sourceIdx: number, destinationIdx: number) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
  addLabel: string;
}

function DragAndDropTextListComponent({
  value,
  onMove,
  onAdd,
  onRemove,
  addLabel,
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
              <EuiDraggable spacing="none" draggableId={String(item.id)} index={idx} key={item.id}>
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
                          componentProps={{ euiFieldProps: { compressed: true } }}
                          readDefaultValueOnForm={!item.isNew}
                        >
                          {(patternField) => (
                            <EuiFieldText
                              value={patternField.value}
                              onChange={(e) => patternField.setValue(e.target.value)}
                              compressed
                              fullWidth
                            />
                          )}
                        </UseField>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          className="pipelineProcessorsEditor__form__dragAndDropList__removeButton"
                          iconType="minusInCircle"
                          color="danger"
                          onClick={() => onRemove(item.id)}
                        />
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
