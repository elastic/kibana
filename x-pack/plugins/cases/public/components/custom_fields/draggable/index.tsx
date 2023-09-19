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
  EuiIcon,
} from '@elastic/eui';

import type { CustomFieldTypes } from '../../../../common/types/domain';
import { builderMap } from '../builder';
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

  const renderTypeLabel = (type?: CustomFieldTypes) => {
    const createdBuilder = type && builderMap[type];

    return createdBuilder && createdBuilder().label;
  };

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
                      <EuiPanel paddingSize="s" data-test-subj={`custom-field-${content}-${type}`}>
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
                          <EuiFlexItem grow={true}>
                            <EuiFlexGroup alignItems="center" gutterSize="s">
                              <EuiFlexItem grow={false}>
                                <h4>{content}</h4>
                              </EuiFlexItem>
                              <EuiText color="subdued">{renderTypeLabel(type)}</EuiText>
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
