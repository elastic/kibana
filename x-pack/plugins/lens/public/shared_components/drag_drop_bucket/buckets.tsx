/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { Assign } from '@kbn/utility-types';
import {
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  DragDropContextProps,
  EuiPanelProps,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { DefaultBucketContainer } from './default_bucket_container';
import type { BucketContainerProps } from './types';

export const DraggableBucketContainer = ({
  id,
  idx,
  children,
  isInsidePanel,
  Container = DefaultBucketContainer,
  ...bucketContainerProps
}: Assign<
  Omit<BucketContainerProps, 'draggableProvided'>,
  {
    id: string;
    idx: number;
    children: React.ReactNode;
    isInsidePanel?: boolean;
    Container?: React.FunctionComponent<BucketContainerProps>;
  }
>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div>
      <EuiDraggable
        index={idx}
        draggableId={id}
        customDragHandle={true}
        isDragDisabled={bucketContainerProps.isNotDraggable}
        style={{
          [isInsidePanel ? 'margin' : 'marginBottom']: euiTheme.size.xs,
        }}
        disableInteractiveElementBlocking
      >
        {(provided) => (
          <Container draggableProvided={provided} {...bucketContainerProps}>
            {children}
          </Container>
        )}
      </EuiDraggable>
    </div>
  );
};

export function DragDropBuckets<T = unknown>({
  items,
  onDragStart,
  onDragEnd,
  droppableId,
  children,
  color,
}: {
  items: T[];
  droppableId: string;
  children: React.ReactElement[];
  onDragStart?: () => void;
  onDragEnd?: (items: T[]) => void;
  color?: EuiPanelProps['color'];
}) {
  const handleDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const newItems = euiDragDropReorder(items, source.index, destination.index);
        onDragEnd?.(newItems);
      }
    },
    [items, onDragEnd]
  );

  return (
    <EuiDragDropContext onDragEnd={handleDragEnd} onDragStart={onDragStart}>
      <EuiPanel
        paddingSize="none"
        color={color}
        style={{ overflow: 'hidden' }}
        hasShadow={false}
        hasBorder={false}
      >
        <EuiDroppable droppableId={droppableId} spacing={color ? 'm' : 'none'}>
          {children}
        </EuiDroppable>
      </EuiPanel>
    </EuiDragDropContext>
  );
}
