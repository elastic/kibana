/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, memo } from 'react';
import { EuiDragDropContext, EuiDroppable } from '@elastic/eui';

import { ProcessorInternal, DraggableLocation, ProcessorSelector } from '../../types';

import { resolveDestinationLocation, mapSelectorToDragLocation } from './utils';

import { TreeNode, TreeNodeComponentArgs } from './tree_node';

import './drag_and_drop_tree_fix.scss';

interface OnDragEndArgs {
  source: DraggableLocation;
  destination: DraggableLocation;
}

export interface Props {
  processors: ProcessorInternal[];
  onDragEnd: (args: OnDragEndArgs) => void;
  renderItem: (arg: TreeNodeComponentArgs) => React.ReactNode;
}

/** This value comes from the {@link ProcessorInternal} type */
const ON_FAILURE = 'onFailure';

/**
 * Takes in array of {@link ProcessorInternal} and renders a drag and drop tree.
 *
 * @remark
 * Because of issues with nesting EuiDroppable (based on react-beautiful-dnd) we render
 * a flat structure with one droppable. This component is responsible for maintaining the
 * {@link ProcessorSelector}s back to the nested structure so that it can emit instructions
 * the reducer will understand.
 */
export const DragAndDropTreeUI: FunctionComponent<Props> = ({
  processors,
  onDragEnd,
  renderItem,
}) => {
  let flatTreeIndex = 0;
  const items: Array<[ProcessorSelector, React.ReactElement]> = [];

  const [currentDragSelector, setCurrentDragSelector] = useState<string | undefined>();

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
          component={renderItem}
        />,
      ]);

      if (processor.onFailure?.length && nodeSelector.join('.') !== currentDragSelector) {
        addRenderedItems(processor.onFailure, nodeSelector.concat(ON_FAILURE), level + 1);
      }
    });
  };

  addRenderedItems(processors, [], 0);

  return (
    <div className="pipelineProcessorsEditor__dragAndDropTreeFixes">
      <EuiDragDropContext
        onBeforeCapture={({ draggableId: serializedSelector }) => {
          setCurrentDragSelector(serializedSelector);
        }}
        onDragEnd={arg => {
          setCurrentDragSelector(undefined);

          const { source, destination, combine } = arg;
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
              source: mapSelectorToDragLocation(sourceSelector),
              destination: resolveDestinationLocation(
                items.map(([selector]) => selector),
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
    </div>
  );
};

export const DragAndDropTree = memo(DragAndDropTreeUI, (prev, current) => {
  return prev.processors === current.processors && prev.onDragEnd === current.onDragEnd;
});
