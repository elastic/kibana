/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDragDropContext, EuiDroppable, EuiPanel } from '@elastic/eui';

import { ProcessorInternal } from '../../types';
import { TreeNode } from './tree_node';

export interface Props {
  processors: ProcessorInternal;
}

export interface PrivateProps extends Props {
  pathSelector: string;
}

const PrivateDragAndDropTree: FunctionComponent<PrivateProps> = ({
  processors,
  pathSelector,
}) => {
  return <EuiPanel>
    <EuiDragDropContext>
      <EuiDroppable droppableId={pathSelector} spacing="m"></EuiDroppable>
      {}
    </EuiDragDropContext>
  </EuiPanel>
};

export const DragAndDropTree: FunctionComponent<Props> = ({ processors }) => {
  return <PrivateDragAndDropTree pathSelector="." processors={processors}
};
