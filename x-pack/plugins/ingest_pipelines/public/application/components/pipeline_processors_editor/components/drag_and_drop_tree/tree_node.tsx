/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import { EuiDraggable, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';

export interface TreeNodeComponentArgs {
  processor: ProcessorInternal;
  selector: ProcessorSelector;
}

interface Props {
  component: (args: TreeNodeComponentArgs) => React.ReactNode;
  id: string;
  selector: ProcessorSelector;
  processor: ProcessorInternal;
  index: number;
  level: number;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  id,
  selector,
  index,
  component,
  level,
}) => {
  return (
    <EuiDraggable spacing="l" draggableId={id} key={id} index={index} customDragHandle>
      {provided => (
        <EuiPanel style={{ marginLeft: 30 * level + 'px' }} paddingSize="s">
          <EuiFlexGroup gutterSize="none" direction="column" alignItems="flexStart">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <div {...provided.dragHandleProps}>
                  <EuiIcon type="grab" />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{component({ processor, selector })}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </EuiDraggable>
  );
};
