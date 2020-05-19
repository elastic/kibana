/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, memo, useRef, useEffect, useMemo } from 'react';
import classNames from 'classnames';
import { EuiDroppable, EuiSpacer } from '@elastic/eui';
import uuid from 'uuid';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import { TreeNode, TreeNodeComponentArgs } from './tree_node';
import { ON_FAILURE, useDragDropContext } from './drag_and_drop_tree_provider';

import './drag_and_drop_tree.scss';

export type RenderTreeItemFunction = (arg: TreeNodeComponentArgs) => React.ReactNode;

export interface Props {
  processors: ProcessorInternal[];
  renderItem: RenderTreeItemFunction;
  baseSelector: ProcessorSelector;
}

export const DROPPABLE_TYPE = 'processor';

export type DerivedProcessor = ProcessorInternal & {
  id: string;
  flattenedIndex: number;
  selector: ProcessorSelector;
};

interface DerivedTreeState {
  selectors: ProcessorSelector[];
  processors: DerivedProcessor[];
}

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
  const {
    currentDragId,
    currentCombineTargetId,
    registerTreeItems,
    unRegisterTreeItems,
  } = useDragDropContext();

  const treeIdRef = useRef<string>();
  const readTreeId = () => {
    if (!treeIdRef.current) {
      treeIdRef.current = uuid.v4();
    }
    return treeIdRef.current;
  };

  const treeId = `${readTreeId()}_PIPELINE_PROCESSORS_EDITOR`;

  const derivedTreeState = useMemo<DerivedTreeState>(() => {
    const state: DerivedTreeState = { processors: [], selectors: [] };
    let flatTreeIndex = 0;
    const getNextFlatTreeIndex = () => {
      return flatTreeIndex++;
    };
    const deriveState = (processor: ProcessorInternal, selector: ProcessorSelector) => {
      state.selectors.push(selector);
      const id = [treeId].concat(selector).join('.');
      const derived = { ...processor, flattenedIndex: getNextFlatTreeIndex(), selector, id };
      if (derived.onFailure) {
        derived.onFailure =
          currentDragId !== id
            ? derived.onFailure.map((p, idx) =>
                deriveState(p, selector.concat([ON_FAILURE, String(idx)]))
              )
            : [];
      }
      return derived;
    };

    state.processors = processors.map((processor, idx) => deriveState(processor, [String(idx)]));
    return state;
  }, [processors, currentDragId, treeId]);

  const droppableContent = derivedTreeState.processors.length ? (
    derivedTreeState.processors.map((processor, idx) => {
      return (
        <TreeNode
          key={processor.flattenedIndex}
          component={renderItem}
          level={0}
          baseSelector={baseSelector}
          index={idx}
          processor={processor}
          treeId={readTreeId()}
          isLastItem={derivedTreeState.processors.length - 1 === idx}
        />
      );
    })
  ) : (
    <EuiSpacer size="xs" />
  );

  useEffect(() => {
    registerTreeItems(treeId, {
      selectors: derivedTreeState.selectors,
      baseSelector,
    });
    return () => unRegisterTreeItems(treeId);
  }, [derivedTreeState, baseSelector, registerTreeItems, unRegisterTreeItems, treeId]);

  const className = classNames({
    pipelineProcessorsEditor__dragAndDropTree__droppableContainer: true,
    'pipelineProcessorsEditor__dragAndDropTree__droppableContainer--combine': Boolean(
      currentCombineTargetId
    ),
  });

  return (
    <div className="pipelineProcessorsEditor__dragAndDropTree">
      <EuiDroppable
        className={className}
        type={DROPPABLE_TYPE}
        droppableId={treeId}
        isCombineEnabled
      >
        {droppableContent}
      </EuiDroppable>
    </div>
  );
};

export const DragAndDropTree = memo(DragAndDropTreeUI, (prev, current) => {
  return prev.processors === current.processors;
});
