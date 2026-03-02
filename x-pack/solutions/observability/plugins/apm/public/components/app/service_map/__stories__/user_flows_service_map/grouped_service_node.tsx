/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SERVICE_NODE_CIRCLE_SIZE } from '../../../../../../common/service_map/constants';
import { NodeLabel } from '../../node_label';

/** Demo-only: data shape for a grouped service node (multiple services collapsed into one). */
export interface GroupedServiceNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  count: number;
}

type GroupedServiceNodeType = Node<GroupedServiceNodeData, 'groupedService'>;

export const GroupedServiceNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<GroupedServiceNodeType>) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

    const containerStyles = css`
      position: relative;
      width: ${SERVICE_NODE_CIRCLE_SIZE}px;
      height: ${SERVICE_NODE_CIRCLE_SIZE}px;
    `;

    const handleStyles = css`
      visibility: hidden;
    `;

    const badgeStyles = css`
      position: absolute;
      top: -${euiTheme.size.xs};
      right: -${euiTheme.size.xs};
      z-index: ${euiTheme.levels.header};
    `;

    const circleStyles = css`
      width: ${SERVICE_NODE_CIRCLE_SIZE}px;
      height: ${SERVICE_NODE_CIRCLE_SIZE}px;
      border-radius: 50%;
      border: 3px solid ${borderColor};
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs} ${euiTheme.colors.lightShade};
      cursor: pointer;
      pointer-events: all;
    `;

    return (
      <>
        <div
          data-test-subj={`serviceMapNode-groupedService-${data.id}`}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <div css={containerStyles}>
            <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
            <div css={circleStyles} role="button" tabIndex={0} aria-label={`Group: ${data.label}`}>
              <EuiBadge color="primary" css={badgeStyles}>
                {data.count}
              </EuiBadge>
            </div>
            <Handle type="source" position={sourcePosition ?? Position.Right} css={handleStyles} />
          </div>
          <NodeLabel label={data.label} selected={selected} />
        </div>
      </>
    );
  }
);

GroupedServiceNode.displayName = 'GroupedServiceNode';
