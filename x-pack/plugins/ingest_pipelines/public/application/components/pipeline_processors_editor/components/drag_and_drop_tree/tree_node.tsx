/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDraggable, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';

import { ProcessorInternal } from '../../types';

export interface TreeNodeComponentArgs {
  processor: ProcessorInternal;
  pathSelector: string;
}

interface Props {
  component: (args: TreeNodeComponentArgs) => React.ReactNode;
  pathSelector: string;
  processor: ProcessorInternal;
  index: number;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  pathSelector,
  index,
  component,
}) => {
  return (
    <EuiDraggable
      spacing="m"
      draggableId={pathSelector}
      key={pathSelector}
      index={index}
      customDragHandle={true}
    >
      {provided => (
        <EuiPanel paddingSize="m">
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <div {...provided.dragHandleProps}>
                <EuiIcon type="grab" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{component({ processor, pathSelector })}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </EuiDraggable>
  );
};
