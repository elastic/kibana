/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import classNames from 'classnames';

import {
  EuiDraggable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButtonIcon,
  EuiPanel,
  EuiText,
  EuiNotificationBadge,
} from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';
import { DerivedProcessor } from './drag_and_drop_tree';
import { useDragDropContext } from './drag_and_drop_tree_provider';

export interface TreeNodeComponentArgs {
  processor: ProcessorInternal;
  selector: ProcessorSelector;
}

export interface Props {
  component: (args: TreeNodeComponentArgs) => React.ReactNode;
  treeId: string;
  index: number;
  baseSelector: ProcessorSelector;
  processor: import('./drag_and_drop_tree').DerivedProcessor;
  level: number;
  isLastItem: boolean;
}

export const TreeNode: FunctionComponent<Props> = ({
  processor,
  component,
  level,
  treeId,
  baseSelector,
  isLastItem,
}) => {
  const { currentCombineTargetId } = useDragDropContext();

  const leftIndentation = level <= 0 ? undefined : 30 * level;

  const angleBracket =
    level > 0 ? (
      <EuiFlexItem
        className="pipelineProcessorsEditor__dragAndDropTree__itemAngleBracketContainer"
        style={{ marginLeft: leftIndentation + 'px' }}
        grow={false}
      >
        <div className="pipelineProcessorsEditor__dragAndDropTree__itemAngleBracket" />
        {!isLastItem ? (
          <div className="pipelineProcessorsEditor__dragAndDropTree__itemAngleBracketConnector" />
        ) : (
          undefined
        )}
      </EuiFlexItem>
    ) : (
      undefined
    );

  const [collapsed, setCollapsed] = useState<boolean>(false);

  const renderChildNodes = () => {
    if (processor.onFailure && !collapsed) {
      return processor.onFailure.map((p, idx) => {
        return (
          <TreeNode
            key={(p as DerivedProcessor).flattenedIndex}
            component={component}
            treeId={treeId}
            index={idx}
            baseSelector={baseSelector}
            processor={p as DerivedProcessor}
            level={level + 1}
            isLastItem={processor.onFailure.length - 1 === idx}
          />
        );
      });
    }
    return;
  };

  const panelClassName = classNames({
    pipelineProcessorsEditor__dragAndDropTree__item: true,
    'pipelineProcessorsEditor__dragAndDropTree__item--combine':
      processor.id === currentCombineTargetId,
  });

  return (
    <>
      <EuiDraggable
        className="pipelineProcessorsEditor__dragAndDropTree__draggableContainer"
        spacing="l"
        draggableId={processor.id}
        key={processor.id}
        index={processor.flattenedIndex}
        customDragHandle
      >
        {provided => (
          <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
            <EuiFlexItem grow={true}>
              <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center">
                {angleBracket}
                <EuiFlexItem grow={1}>
                  <div className="pipelineProcessorsEditor__dragAndDropTree__itemSpacer">
                    <EuiPanel className={panelClassName} paddingSize="s">
                      <EuiFlexGroup
                        responsive={false}
                        gutterSize="none"
                        direction="column"
                        alignItems="flexStart"
                      >
                        <EuiFlexItem grow={1}>
                          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
                            <EuiFlexItem grow={false}>
                              <div {...provided.dragHandleProps}>
                                <EuiIcon type="grab" />
                              </div>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              {component({ processor, selector: processor.selector })}
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPanel>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {processor.onFailure?.length ? (
              <EuiFlexItem grow={true}>
                <EuiFlexGroup
                  style={{ marginLeft: (leftIndentation ?? 0) + 20 + 'px' }}
                  alignItems="center"
                  gutterSize="none"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      aria-label="TODO FIX"
                      onClick={() => setCollapsed(c => !c)}
                      iconType={collapsed ? 'arrowRight' : 'arrowDown'}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">On Failure</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge color="subdued">
                      {processor.onFailure.length}
                    </EuiNotificationBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            ) : (
              undefined
            )}
          </EuiFlexGroup>
        )}
      </EuiDraggable>
      {renderChildNodes()}
    </>
  );
};
