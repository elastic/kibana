/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ProcessorInternal } from '../../types';

import { PrivateTree, TreeMode, ProcessorInfo, PrivateOnActionHandler } from './tree';
import { RenderTreeItemFunction } from './types';

export interface Props {
  processor: ProcessorInternal;
  processorInfo: ProcessorInfo;
  privateOnAction: PrivateOnActionHandler;
  mode: TreeMode;
  renderItem: RenderTreeItemFunction;
  selectedProcessorInfo?: ProcessorInfo;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  processorInfo,
  privateOnAction,
  mode,
  selectedProcessorInfo,
  renderItem,
}) => {
  const onMove = () => {
    privateOnAction({ type: 'selectToMove', payload: processorInfo });
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
          {renderItem({ processor, selector: processorInfo.selector, onMove })}
        </EuiFlexItem>
      </EuiFlexGroup>
      {processor.onFailure?.length && (
        <PrivateTree
          renderItem={renderItem}
          selectedProcessorInfo={selectedProcessorInfo}
          privateOnAction={privateOnAction}
          selector={processorInfo.selector.concat('onFailure')}
          processors={processor.onFailure}
          mode={mode}
        />
      )}
    </EuiPanel>
  );
};
