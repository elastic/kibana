/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import type { Node } from '@xyflow/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import type { NodeProps } from '@xyflow/react';
import { css } from '@emotion/react';
import { ServiceNode } from '../../service_node';
import type { ServiceNodeData } from '../../../../../../common/service_map';
import { SERVICE_NODE_CIRCLE_SIZE } from '../../../../../../common/service_map/constants';

/** Story-only: optional fields for collapse badge on a service node */
export interface ServiceNodeWithCollapseBadgeData extends ServiceNodeData {
  /** Number of collapsed (hidden) downstream connections; when > 0, badge is shown */
  collapsedCount?: number;
  /** Whether this node's downstream is currently expanded */
  isExpanded?: boolean;
  /** Callback when badge is clicked (toggle expand/collapse) */
  onBadgeClick?: (nodeId: string) => void;
}

type ServiceNodeWithCollapseBadgeProps = NodeProps<
  Node<ServiceNodeWithCollapseBadgeData, 'service'>
>;

/** Vertical center of the service circle (first row of the node) for badge alignment */
const CIRCLE_CENTER_TOP = SERVICE_NODE_CIRCLE_SIZE / 2;

export const ServiceNodeWithCollapseBadge = memo(
  ({ data, selected, sourcePosition, targetPosition }: ServiceNodeWithCollapseBadgeProps) => {
    const { euiTheme } = useEuiTheme();
    const count = data.collapsedCount ?? 0;
    const isExpanded = data.isExpanded ?? false;
    const showBadge = count > 0;

    const handleBadgeClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        data.onBadgeClick?.(data.id);
      },
      [data]
    );

    const badgeWrapperStyles = css`
      position: absolute;
      top: ${CIRCLE_CENTER_TOP}px;
      left: calc(30% + ${SERVICE_NODE_CIRCLE_SIZE / 2}px + ${euiTheme.size.s});
      transform: translateY(-50%);
      z-index: ${euiTheme.levels.header};
      cursor: pointer;
    `;

    return (
      <div
        data-test-subj={`serviceMapNode-serviceWithBadge-${data.id}`}
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <ServiceNode
          data={data}
          selected={selected}
          sourcePosition={sourcePosition}
          targetPosition={targetPosition}
        />
        {showBadge && (
          <button
            type="button"
            css={badgeWrapperStyles}
            onClick={handleBadgeClick}
            aria-label={
              isExpanded ? `Collapse ${count} connections` : `Expand ${count} collapsed connections`
            }
            data-test-subj={`serviceMapCollapseBadge-${data.id}`}
            style={{
              padding: 0,
              border: 'none',
              background: 'none',
              lineHeight: 0,
            }}
          >
            <EuiBadge color="primary">{isExpanded ? `−${count}` : `+${count}`}</EuiBadge>
          </button>
        )}
      </div>
    );
  }
);

ServiceNodeWithCollapseBadge.displayName = 'ServiceNodeWithCollapseBadge';
