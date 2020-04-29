/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDraggable, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import { PrivateDragAndDropTree } from './drag_and_drop_tree';

export interface TreeNodeComponentArgs {
  processor: ProcessorInternal;
  selector: ProcessorSelector;
}

interface Props {
  component: (args: TreeNodeComponentArgs) => React.ReactNode;
  selector: ProcessorSelector;
  processor: ProcessorInternal;
  isDroppable: boolean;
  index: number;
  currentDragSelector?: string;
}

/** This value comes from the {@link ProcessorInternal} type */
const ON_FAILURE = 'onFailure';

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  selector,
  index,
  component,
  isDroppable,
  currentDragSelector,
}) => {
  const id = selector.join('.');
  return (
    <EuiDraggable spacing="l" draggableId={id} key={id} index={index} customDragHandle={true}>
      {provided => (
        <EuiPanel paddingSize="s">
          <EuiFlexGroup gutterSize="none" direction="column" alignItems="flexStart">
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <div {...provided.dragHandleProps}>
                  <EuiIcon type="grab" />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{component({ processor, selector })}</EuiFlexItem>
            </EuiFlexGroup>
            <PrivateDragAndDropTree
              currentDragSelector={currentDragSelector}
              isDroppable={isDroppable}
              selector={selector.concat([ON_FAILURE])}
              processors={processor.onFailure ?? []}
              nodeComponent={component}
            />
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </EuiDraggable>
  );
};
