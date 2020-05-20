/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiPanel, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ProcessorInternal, ProcessorSelector } from '../../types';

import { PrivateTree, TreeMode, SelectedNode, PrivateTreeAction } from './tree';

export interface Props {
  selector: ProcessorSelector;
  processor: ProcessorInternal;
  onAction: (arg: { type: PrivateTreeAction; selector: ProcessorSelector }) => void;
  mode: TreeMode;
  selectedNode?: SelectedNode;
}

export const TreeLeaf: FunctionComponent<Props> = ({
  processor,
  selector,
  onAction,
  mode,
  selectedNode,
}) => {
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
          {processor.type}
        </EuiFlexItem>
        <EuiFlexItem className="processorsEditor__tree__treeLeaf__itemCenter" grow={false}>
          <EuiButtonEmpty onClick={() => onAction({ type: 'selectToMove', selector })}>
            Move
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      {processor.onFailure?.length && (
        <PrivateTree
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
