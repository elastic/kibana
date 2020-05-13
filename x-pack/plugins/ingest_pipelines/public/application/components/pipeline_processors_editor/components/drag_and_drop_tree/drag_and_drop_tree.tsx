/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, memo, useRef, useMemo, useEffect } from 'react';
import { EuiDroppable, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import { TreeNode, TreeNodeComponentArgs } from './tree_node';
import { useDragDropContext, ON_FAILURE } from './drag_and_drop_tree_provider';

import './drag_and_drop_tree.scss';

export type RenderTreeItemFunction = (arg: TreeNodeComponentArgs) => React.ReactNode;

export interface Props {
  processors: ProcessorInternal[];
  renderItem: RenderTreeItemFunction;
  baseSelector: ProcessorSelector;
}

type SelectorReactElementTuple = [ProcessorSelector, React.ReactElement];

export const DROPPABLE_TYPE = 'processor';

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
  renderItem,
  baseSelector,
}) => {
  const { currentDragSelector, registerTreeItems, unRegisterTreeItems } = useDragDropContext();

  const treeIdRef = useRef<string>();
  const readTreeId = () => {
    if (!treeIdRef.current) {
      treeIdRef.current = uuid.v4();
    }
    return treeIdRef.current;
  };

  const items = useMemo<SelectorReactElementTuple[]>(() => {
    let flatTreeIndex = 0;
    const _items: SelectorReactElementTuple[] = [];
    const treeId = readTreeId();

    const addRenderedItems = (
      _processors: ProcessorInternal[],
      _selector: ProcessorSelector,
      level = 0
    ) => {
      _processors.forEach((processor, idx) => {
        const index = flatTreeIndex++;
        const nodeSelector = _selector.concat(String(idx));
        const id = [treeId].concat(nodeSelector).join('.');
        _items.push([
          nodeSelector,
          <TreeNode
            key={index}
            index={index}
            level={level}
            processor={processor}
            id={id}
            selector={baseSelector.concat(nodeSelector)}
            component={renderItem}
          />,
        ]);

        if (
          processor.onFailure?.length &&
          [treeId].concat(nodeSelector).join('.') !== currentDragSelector
        ) {
          addRenderedItems(processor.onFailure, nodeSelector.concat(ON_FAILURE), level + 1);
        }
      });
    };

    addRenderedItems(processors, [], 0);
    return _items;
  }, [processors, renderItem, currentDragSelector, baseSelector]);

  const treeId = `${readTreeId()}_PIPELINE_PROCESSORS_EDITOR`;

  useEffect(() => {
    registerTreeItems(treeId, {
      selectors: items.map(([selector]) => selector),
      baseSelector,
    });

    return () => unRegisterTreeItems(treeId);
  }, [items, registerTreeItems, unRegisterTreeItems, treeId, baseSelector]);

  const droppableContent = items.length ? (
    items.map(([, component]) => component)
  ) : (
    <EuiSpacer size="xs" />
  );

  return (
    <div className="pipelineProcessorsEditor__dragAndDropTree">
      <EuiDroppable type={DROPPABLE_TYPE} droppableId={treeId} isCombineEnabled>
        {droppableContent}
      </EuiDroppable>
    </div>
  );
};

export const DragAndDropTree = memo(DragAndDropTreeUI, (prev, current) => {
  return prev.processors === current.processors;
});
