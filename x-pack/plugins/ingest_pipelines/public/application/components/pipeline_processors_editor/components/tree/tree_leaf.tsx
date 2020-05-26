/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ProcessorInternal, ProcessorSelector } from '../../types';

import { PrivateTree, TreeMode, SelectedNode, PrivateTreeAction } from './tree';
import { RenderTreeItemFunction } from './types';

export interface Props {
  selector: ProcessorSelector;
  processor: ProcessorInternal;
  onAction: (arg: { type: PrivateTreeAction; selector: ProcessorSelector }) => void;
  mode: TreeMode;
  renderItem: RenderTreeItemFunction;
  selectedNode?: SelectedNode;
}

export const TreeLeaf: FunctionComponent<Props> = ({
  processor,
  selector,
  onAction,
  mode,
  selectedNode,
  renderItem,
}) => {
  const onMove = () => {
    onAction({ type: 'selectToMove', selector });
  };
  return (
    <EuiPanel paddingSize="s">
      <EuiFlexGroup
        className="processorsEditor__tree__treeLeaf__itemContainer"
        alignItems="center"
        justifyContent="flexStart"
        responsive={false}
        gutterSize="none"
      >
        <EuiFlexItem className="processorsEditor__tree__treeLeaf__itemLeft" grow={false}>
          {renderItem({ processor, selector, onMove })}
        </EuiFlexItem>
      </EuiFlexGroup>
      {processor.onFailure?.length && (
        <PrivateTree
          renderItem={renderItem}
          selectedNode={selectedNode}
          onAction={onAction}
          selector={selector.concat('onFailure')}
          processors={processor.onFailure}
          mode={mode}
        />
      )}
    </EuiPanel>
  );
};
