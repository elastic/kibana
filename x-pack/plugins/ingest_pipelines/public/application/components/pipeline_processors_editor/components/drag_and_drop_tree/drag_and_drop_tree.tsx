/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDragDropContext, EuiDroppable } from '@elastic/eui';

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
}

export const ROOT_PATH_ID = 'ROOT_PATH_ID';

export const PrivateDragAndDropTree: FunctionComponent<PrivateProps> = ({
  processors,
  selector,
  nodeComponent,
}) => {
  const id = selector.join('.') || ROOT_PATH_ID;
  return (
    <EuiDroppable droppableId={id} spacing="m">
      {processors.map((processor, idx) => {
        return (
          <TreeNode
            key={idx}
            processor={processor}
            selector={selector.concat(String(idx))}
            index={idx}
            component={nodeComponent}
          />
        );
      })}
    </EuiDroppable>
  );
};

export const DragAndDropTree: FunctionComponent<Props> = ({
  processors,
  onDragEnd,
  nodeComponent,
}) => {
  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
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
      <PrivateDragAndDropTree selector={[]} processors={processors} nodeComponent={nodeComponent} />
    </EuiDragDropContext>
  );
};
