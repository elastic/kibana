/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';

import './tree.scss';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import { TreeLeaf } from './tree_leaf';

export type TreeMode = 'copy' | 'move' | 'idle';

export interface SelectedNode {
  selector: ProcessorSelector;
}

export interface PrivateProps {
  processors: ProcessorInternal[];
  selector: ProcessorSelector;
  onAction: (args: any) => void;
  mode: TreeMode;
  selectedNode?: SelectedNode;
}

export type PrivateTreeAction = 'selectToMove' | 'move';

interface PrivateTreeActionArg {
  type: PrivateTreeAction;
  selector: ProcessorSelector;
}

export const PrivateTree: FunctionComponent<PrivateProps> = ({
  processors,
  selector,
  selectedNode,
  onAction,
  mode,
}) => {
  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
      {processors.map((processor, idx) => {
        const processorSelector = selector.concat(String(idx));
        const maybeSelectedNodeString = selectedNode?.selector.join('.');
        const adjacentToSelectedNode =
          maybeSelectedNodeString === processorSelector.join('.') ||
          maybeSelectedNodeString === selector.concat(String(idx + 1)).join('.');
        return (
          <React.Fragment key={idx}>
            {idx === 0 ? (
              <EuiFlexItem>
                <EuiButtonIcon
                  aria-label="temp"
                  iconType="pin"
                  disabled={
                    mode !== 'move' ||
                    Boolean(
                      selectedNode &&
                        selectedNode.selector[selectedNode.selector.length - 1] === '0' &&
                        selectedNode.selector.length === processorSelector.length &&
                        selectedNode.selector.every((p, i) => processorSelector[i] === p)
                    )
                  }
                  onClick={() => {
                    onAction({ type: 'move', selector: selector.concat(String(idx)) });
                  }}
                >
                  Move Here
                </EuiButtonIcon>
              </EuiFlexItem>
            ) : (
              undefined
            )}
            <EuiFlexItem>
              <TreeLeaf
                mode={mode}
                selector={processorSelector}
                onAction={onAction}
                processor={processor}
                selectedNode={selectedNode}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonIcon
                aria-label="temp"
                iconType="pin"
                disabled={mode !== 'move' || adjacentToSelectedNode}
                onClick={() => {
                  onAction({ type: 'move', selector: selector.concat(String(idx + 1)) });
                }}
              >
                Move Here
              </EuiButtonIcon>
            </EuiFlexItem>
          </React.Fragment>
        );
      })}
    </EuiFlexGroup>
  );
};

export interface Props {
  processors: ProcessorInternal[];
  baseSelector: ProcessorSelector;
  onAction: (action: { source: ProcessorSelector; destination: ProcessorSelector }) => void;
}

export const Tree: FunctionComponent<Props> = ({ processors, baseSelector, onAction }) => {
  const [treeMode, setTreeMode] = useState<TreeMode>('idle');
  const [selectedNode, setSelectedNode] = useState<SelectedNode | undefined>();
  return (
    <PrivateTree
      onAction={action => {
        if (action.type === 'selectToMove') {
          setTreeMode('move');
          setSelectedNode({ selector: action.selector });
          return;
        }

        if (action.type === 'move') {
          onAction({ source: selectedNode!.selector, destination: action.selector });
          setSelectedNode(undefined);
          setTreeMode('idle');
        }
      }}
      selectedNode={selectedNode}
      processors={processors}
      selector={baseSelector}
      mode={treeMode}
    />
  );
};
