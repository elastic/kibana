/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDragDropContext, EuiDroppable } from '@elastic/eui';

import { ProcessorInternal, DraggableLocation, ProcessorSelector } from '../../types';

import { mapDestinationIndexToTreeLocation } from './utils';

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

/** This value comes from the {@link ProcessorInternal} type */
const ON_FAILURE = 'onFailure';

export const DragAndDropTree: FunctionComponent<Props> = ({
  processors,
  onDragEnd,
  nodeComponent,
}) => {
  let flatTreeIndex = 0;
  const items: Array<[ProcessorSelector, React.ReactElement]> = [];

  const addRenderedItems = (
    _processors: ProcessorInternal[],
    _selector: ProcessorSelector,
    level = 0
  ) => {
    _processors.forEach((processor, idx) => {
      const index = flatTreeIndex++;
      const nodeSelector = _selector.concat(String(idx));
      items.push([
        nodeSelector,
        <TreeNode
          key={index}
          index={index}
          level={level}
          processor={processor}
          selector={nodeSelector}
          component={nodeComponent}
        />,
      ]);

      if (processor.onFailure?.length) {
        addRenderedItems(processor.onFailure, nodeSelector.concat(ON_FAILURE), level + 1);
      }
    });
  };

  addRenderedItems(processors, [], 0);

  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination, combine }) => {
        if (source && combine) {
          const [sourceSelector] = items[source.index];
          const destinationSelector = combine.draggableId.split('.');
          onDragEnd({
            source: {
              index: parseInt(sourceSelector[sourceSelector.length - 1], 10),
              selector: sourceSelector.slice(0, -1),
            },
            destination: {
              index: parseInt(destinationSelector[destinationSelector.length - 1], 10),
              selector: destinationSelector.concat(ON_FAILURE),
            },
          });
          return;
        }

        if (source && destination) {
          const [sourceSelector] = items[source.index];
          onDragEnd({
            source: {
              index: parseInt(sourceSelector[sourceSelector.length - 1], 10),
              selector: sourceSelector.slice(0, -1),
            },
            destination: mapDestinationIndexToTreeLocation(
              items.map(([selector]) => selector),
              !sourceSelector.slice(0, -1).length,
              destination.index
            ),
          });
        }
      }}
    >
      <EuiDroppable droppableId="PIPELINE_PROCESSORS_EDITOR" spacing="l" isCombineEnabled>
        {items.map(([, component]) => component)}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
