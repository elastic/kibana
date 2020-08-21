/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';
import uuid from 'uuid';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';

interface Item {
  id: number;
}

interface Props<ItemT extends Item> {
  value: ItemT[];
  onMove: (sourceIdx: number, destinationIdx: number) => void;
  renderItem: (item: ItemT) => React.ReactNode;
}

export function DragAndDropList<I extends Item>({
  value,
  onMove,
  renderItem,
}: Props<I>): JSX.Element {
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
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable droppableId={droppableId}>
        {value.map((item, idx) => {
          return (
            <EuiDraggable draggableId={String(item.id)} index={idx} key={item.id}>
              {(provided) => {
                return (
                  <EuiPanel hasShadow={false} paddingSize="s">
                    <EuiFlexGroup gutterSize="none">
                      <EuiFlexItem grow={false}>
                        <div {...provided.dragHandleProps}>
                          <EuiIcon type="grab" />
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem>{renderItem(item)}</EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                );
              }}
            </EuiDraggable>
          );
        })}
      </EuiDroppable>
    </EuiDragDropContext>
  );
}
