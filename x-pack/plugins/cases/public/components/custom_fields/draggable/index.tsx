/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import type { CustomFieldTypes } from '../types';

export interface ListOption {
  content: string;
  id: string;
  type?: CustomFieldTypes;
}

export interface Props {
  listValues: ListOption[];
}

const DraggableComponent: React.FC<Props> = (props) => {
  const { listValues } = props;

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem>
          {listValues.length ? (
            <EuiDragDropContext onDragEnd={() => {}}>
              <EuiDroppable droppableId="droppable-area" spacing="m" withPanel>
                {listValues.map(({ content, id, type }, idx) => (
                  <EuiDraggable
                    spacing="m"
                    key={id}
                    index={idx}
                    draggableId={id}
                    customDragHandle={true}
                    hasInteractiveChildren={true}
                  >
                    {(provided) => (
                      <EuiPanel paddingSize="s">
                        <EuiFlexGroup alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiPanel
                              color="transparent"
                              paddingSize="s"
                              {...provided.dragHandleProps}
                              aria-label="Drag Handle"
                            >
                              {/* <EuiIcon type="grab" /> // icon for drag handle */}
                            </EuiPanel>
                          </EuiFlexItem>
                          <EuiFlexItem grow={true}>
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <h4>{content}</h4>
                              </EuiFlexItem>
                              <EuiText color="subdued">{type}</EuiText>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    )}
                  </EuiDraggable>
                ))}
              </EuiDroppable>
            </EuiDragDropContext>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

DraggableComponent.displayName = 'Draggable';

export const Draggable = React.memo(DraggableComponent);
