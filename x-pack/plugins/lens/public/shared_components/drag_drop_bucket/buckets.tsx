/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  DragDropContextProps,
} from '@elastic/eui';
import { DefaultBucketContainer } from './default_bucket_container';
import type { BucketContainerProps } from './types';

export const DraggableBucketContainer = ({
  id,
  idx,
  children,
  Container = DefaultBucketContainer,
  ...bucketContainerProps
}: {
  id: string;
  idx: number;
  children: React.ReactNode;
  Container?: React.FunctionComponent<BucketContainerProps>;
} & BucketContainerProps) => {
  return (
    <EuiDraggable
      style={{ marginBottom: 4 }}
      spacing="none"
      index={idx}
      draggableId={id}
      disableInteractiveElementBlocking
    >
      {(provided) => <Container {...bucketContainerProps}>{children}</Container>}
    </EuiDraggable>
  );
};

export function DragDropBuckets<T = unknown>({
  items,
  onDragStart,
  onDragEnd,
  droppableId,
  children,
  className,
}: {
  items: T[];
  onDragStart: () => void;
  onDragEnd: (items: T[]) => void;
  droppableId: string;
  children: React.ReactElement[];
  className?: string;
}) {
  const handleDragEnd: DragDropContextProps['onDragEnd'] = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const newItems = euiDragDropReorder(items, source.index, destination.index);
        onDragEnd(newItems);
      }
    },
    [items, onDragEnd]
  );

  return (
    <EuiDragDropContext onDragEnd={handleDragEnd} onDragStart={onDragStart}>
      <EuiDroppable droppableId={droppableId} spacing="none" className={className}>
        {children}
      </EuiDroppable>
    </EuiDragDropContext>
  );
}
