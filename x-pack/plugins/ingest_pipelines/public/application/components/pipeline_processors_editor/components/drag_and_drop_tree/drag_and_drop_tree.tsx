/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiDragDropContext, EuiDroppable, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ProcessorInternal, DraggableLocation, ProcessorSelector } from '../../types';

import { TreeNode, TreeNodeComponentArgs } from './tree_node';

interface OnDragEndArgs {
  source: DraggableLocation;
  destination: DraggableLocation;
}

export interface Props {
  processors: ProcessorInternal[];
  onDragEnd: (args: OnDragEndArgs) => void;
  nodeComponent: (arg: TreeNodeComponentArgs) => React.ReactNode;
}

export interface PrivateProps extends Omit<Props, 'onDragEnd'> {
  selector: ProcessorSelector;
  isDroppable: boolean;
  currentDragSelector?: string;
}

export const ROOT_PATH_ID = 'ROOT_PATH_ID';

export const PrivateDragAndDropTree: FunctionComponent<PrivateProps> = ({
  processors,
  selector,
  nodeComponent,
  isDroppable,
  currentDragSelector,
}) => {
  const serializedSelector = selector.join('.');
  const isRoot = !serializedSelector;
  const id = isRoot ? ROOT_PATH_ID : serializedSelector;
  const droppable = (
    <EuiDroppable
      // type={serializedSelector}
      isDropDisabled={!isDroppable}
      droppableId={id}
      spacing="l"
    >
      {processors.map((processor, idx) => {
        const nodeSelector = selector.concat(String(idx));
        return (
          <TreeNode
            currentDragSelector={currentDragSelector}
            isDroppable={!isDroppable ? false : currentDragSelector !== nodeSelector.join('.')}
            key={idx}
            processor={processor}
            selector={nodeSelector}
            index={idx}
            component={nodeComponent}
          />
        );
      })}
    </EuiDroppable>
  );

  if (isRoot || !processors.length) {
    return droppable;
  } else {
    return (
      <EuiFlexGroup gutterSize="none" responsive={false}>
        <EuiFlexItem grow={false}>
          <div style={{ width: '30px' }} />
        </EuiFlexItem>
        <EuiFlexItem>{droppable}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
};

export const DragAndDropTree: FunctionComponent<Props> = ({
  processors,
  onDragEnd,
  nodeComponent,
}) => {
  const [currentDragSelector, setCurrentDragSelector] = useState<string | undefined>();

  return (
    <EuiDragDropContext
      onBeforeCapture={({ draggableId: selector }) => {
        setCurrentDragSelector(selector);
      }}
      onDragEnd={({ source, destination }) => {
        setCurrentDragSelector(undefined);
        if (source && destination) {
          onDragEnd({
            source: {
              index: source.index,
              selector: source.droppableId === ROOT_PATH_ID ? [] : source.droppableId.split('.'),
            },
            destination: {
              index: destination.index,
              selector:
                destination.droppableId === ROOT_PATH_ID ? [] : destination.droppableId.split('.'),
            },
          });
        }
      }}
    >
      <PrivateDragAndDropTree
        selector={[]}
        isDroppable={true}
        currentDragSelector={currentDragSelector}
        processors={processors}
        nodeComponent={nodeComponent}
      />
    </EuiDragDropContext>
  );
};
