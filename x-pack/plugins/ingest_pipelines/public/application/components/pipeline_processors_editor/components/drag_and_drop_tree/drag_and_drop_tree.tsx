/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDragDropContext, EuiDroppable, EuiPanel } from '@elastic/eui';

import { ProcessorInternal, DraggableLocation } from '../../types';

import { TreeNode } from './tree_node';

interface OnDragEndArgs {
  source: DraggableLocation;
  destination: DraggableLocation;
}

export interface Props {
  processors: ProcessorInternal[];
  onDragEnd: (args: OnDragEndArgs) => void;
}

export interface PrivateProps extends Omit<Props, 'onDragEnd'> {
  pathSelector: string;
}

const ROOT_PATH_ID = 'ROOT_PATH_ID';

const PrivateDragAndDropTree: FunctionComponent<PrivateProps> = ({ processors, pathSelector }) => {
  return (
    <EuiPanel>
      <EuiDroppable droppableId={pathSelector || ROOT_PATH_ID} spacing="m">
        {processors.map((processor, idx) => {
          return (
            <TreeNode
              key={idx}
              processor={processor}
              pathSelector={pathSelector + `${idx}`}
              index={idx}
            />
          );
        })}
      </EuiDroppable>
    </EuiPanel>
  );
};

export const DragAndDropTree: FunctionComponent<Props> = ({ processors, onDragEnd }) => {
  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
        if (source && destination) {
          onDragEnd({
            source: {
              index: source.index,
              pathSelector: source.droppableId === ROOT_PATH_ID ? undefined : source.droppableId,
            },
            destination: {
              index: destination.index,
              pathSelector:
                destination.droppableId === ROOT_PATH_ID ? undefined : destination.droppableId,
            },
          });
        }
      }}
    >
      <PrivateDragAndDropTree pathSelector="" processors={processors} />
    </EuiDragDropContext>
  );
};
