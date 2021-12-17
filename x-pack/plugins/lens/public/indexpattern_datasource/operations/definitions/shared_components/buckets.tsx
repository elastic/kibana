/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButtonIcon,
  EuiIcon,
  EuiDragDropContext,
  euiDragDropReorder,
  EuiDraggable,
  EuiDroppable,
  EuiButtonEmpty,
} from '@elastic/eui';

export const NewBucketButton = ({
  label,
  onClick,
  ['data-test-subj']: dataTestSubj,
  isDisabled,
}: {
  label: string;
  onClick: () => void;
  'data-test-subj'?: string;
  isDisabled?: boolean;
}) => (
  <EuiButtonEmpty
    data-test-subj={dataTestSubj ?? 'lns-newBucket-add'}
    size="xs"
    iconType="plusInCircle"
    onClick={onClick}
    isDisabled={isDisabled}
  >
    {label}
  </EuiButtonEmpty>
);

interface BucketContainerProps {
  isInvalid?: boolean;
  invalidMessage: string;
  onRemoveClick: () => void;
  removeTitle: string;
  isNotRemovable?: boolean;
  children: React.ReactNode;
  dataTestSubj?: string;
}

const BucketContainer = ({
  isInvalid,
  invalidMessage,
  onRemoveClick,
  removeTitle,
  children,
  dataTestSubj,
  isNotRemovable,
}: BucketContainerProps) => {
  return (
    <EuiPanel paddingSize="none" data-test-subj={dataTestSubj} hasShadow={false} hasBorder>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{/* Empty for spacing */}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon
            size="s"
            color={isInvalid ? 'danger' : 'subdued'}
            type={isInvalid ? 'alert' : 'grab'}
            title={
              isInvalid
                ? invalidMessage
                : i18n.translate('xpack.lens.customBucketContainer.dragToReorder', {
                    defaultMessage: 'Drag to reorder',
                  })
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>{children}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconSize="s"
            iconType="cross"
            color="danger"
            data-test-subj="lns-customBucketContainer-remove"
            onClick={onRemoveClick}
            aria-label={removeTitle}
            title={removeTitle}
            disabled={isNotRemovable}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const DraggableBucketContainer = ({
  id,
  idx,
  children,
  ...bucketContainerProps
}: {
  id: string;
  idx: number;
  children: React.ReactNode;
} & BucketContainerProps) => {
  return (
    <EuiDraggable
      style={{ marginBottom: 4 }}
      spacing="none"
      index={idx}
      draggableId={id}
      disableInteractiveElementBlocking
    >
      {(provided) => <BucketContainer {...bucketContainerProps}>{children}</BucketContainer>}
    </EuiDraggable>
  );
};

interface DraggableLocation {
  droppableId: string;
  index: number;
}

export const DragDropBuckets = ({
  items,
  onDragStart,
  onDragEnd,
  droppableId,
  children,
}: {
  items: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onDragStart: () => void;
  onDragEnd: (items: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  droppableId: string;
  children: React.ReactElement[];
}) => {
  const handleDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const newItems = euiDragDropReorder(items, source.index, destination.index);
      onDragEnd(newItems);
    }
  };
  return (
    <EuiDragDropContext onDragEnd={handleDragEnd} onDragStart={onDragStart}>
      <EuiDroppable droppableId={droppableId} spacing="none">
        {children}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
