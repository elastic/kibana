/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getSpanIcon } from '@kbn/apm-ui-shared';
import { css } from '@emotion/react';
import type { DependencyNodeData } from '../../../../../common/service_map/react_flow_types';
import {
  DEPENDENCY_NODE_DIAMOND_SIZE,
  DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE,
} from '../../../../../common/service_map/constants';
import { NodeLabel } from './node_label';

type DependencyNodeType = Node<DependencyNodeData, 'dependency'>;

export const DependencyNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<DependencyNodeType>) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

    const iconUrl = useMemo(() => {
      if (data.spanType || data.spanSubtype) {
        return getSpanIcon(data.spanType, data.spanSubtype);
      }
      return null;
    }, [data.spanType, data.spanSubtype]);

    const containerStyles = css`
      position: relative;
      width: ${DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE}px;
      height: ${DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE}px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const handleStyles = css`
      visibility: hidden;
    `;

    const diamondStyles = css`
      width: ${DEPENDENCY_NODE_DIAMOND_SIZE}px;
      height: ${DEPENDENCY_NODE_DIAMOND_SIZE}px;
      transform: rotate(45deg);
      border: ${euiTheme.border.width.thick} solid ${borderColor};
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs} ${euiTheme.colors.lightShade};
      box-sizing: border-box;
      cursor: pointer;
      pointer-events: all;
    `;

    const iconContainerStyles = css`
      transform: rotate(-45deg);
    `;

    const iconStyles = css`
      width: 20px;
      height: 20px;
      object-fit: contain;
      pointer-events: none;
    `;

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={`serviceMapNode-dependency-${data.id}`}
      >
        <EuiFlexItem grow={false} css={containerStyles}>
          <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
          <div css={diamondStyles}>
            <div css={iconContainerStyles}>
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt={data.spanType || data.spanSubtype || 'dependency'}
                  css={iconStyles}
                />
              )}
            </div>
          </div>
          <Handle type="source" position={sourcePosition ?? Position.Right} css={handleStyles} />
        </EuiFlexItem>
        <NodeLabel label={data.label} selected={selected} />
      </EuiFlexGroup>
    );
  }
);

DependencyNode.displayName = 'DependencyNode';
