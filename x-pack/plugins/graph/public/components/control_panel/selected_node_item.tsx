/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hexToRgb, isColorDark } from '@elastic/eui';
import classNames from 'classnames';
import React from 'react';
import { WorkspaceNode } from '../../types';
import { getIconOffset, IconRenderer } from '../icon_renderer';

const isHexColorDark = (color: string) => isColorDark(...hexToRgb(color));

interface SelectedNodeItemProps {
  node: WorkspaceNode;
  isHighlighted: boolean;
  onDeselectNode: (node: WorkspaceNode) => void;
  onSelectedFieldClick: (node: WorkspaceNode) => void;
}

export const SelectedNodeItem = ({
  node,
  isHighlighted,
  onSelectedFieldClick,
  onDeselectNode,
}: SelectedNodeItemProps) => {
  const fieldClasses = classNames('gphSelectionList__field', {
    ['gphSelectionList__field--selected']: isHighlighted,
  });
  const fieldIconClasses = classNames('fa', 'gphNode__text', 'gphSelectionList__icon', {
    ['gphNode__text--inverse']: isHexColorDark(node.color),
  });
  const offset = getIconOffset(node.icon);

  return (
    <div aria-hidden="true" className={fieldClasses} onClick={() => onSelectedFieldClick(node)}>
      <svg width="24" height="24">
        <circle
          className="gphNode__circle"
          r="10"
          cx="12"
          cy="12"
          style={{ fill: node.color }}
          onClick={() => onDeselectNode(node)}
        />
        <IconRenderer
          onClick={() => onDeselectNode(node)}
          icon={node.icon}
          className={fieldIconClasses}
          x={(offset?.x || 0) / 2}
          y={(offset?.y || 0) / 2}
        />
      </svg>
      <span>{node.label}</span>
      {node.numChildren > 0 && <span> (+{node.numChildren})</span>}
    </div>
  );
};
