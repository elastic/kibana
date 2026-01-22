/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, useCallback } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { getAgentIcon } from '@kbn/custom-icons';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  getServiceHealthStatusColor,
  ServiceHealthStatus,
} from '../../../../../common/service_health_status';

export interface ServiceMapNodeData {
  id: string;
  label: string;
  agentName?: string;
  spanType?: string;
  spanSubtype?: string;
  serviceAnomalyStats?: {
    healthStatus?: ServiceHealthStatus;
  };
  isService: boolean;
  /** Group ID if this node belongs to a group */
  groupId?: string;
  /** Group name if this node belongs to a group */
  groupName?: string;
  /** Callback to collapse the group this node belongs to */
  onCollapseGroup?: (groupId: string) => void;
  groupedConnections?: Array<any>; // For grouped resource nodes (e.g., Kafka topics)
  [key: string]: unknown; // Allow additional properties for popover content
}

// Custom Service Node component (circular)
export const ServiceNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<Node<ServiceMapNodeData>>) => {
    const { euiTheme, colorMode } = useEuiTheme();
    const isDarkMode = colorMode === 'DARK';

    const belongsToGroup = !!data.groupId;

    const borderColor = useMemo(() => {
      if (data.serviceAnomalyStats?.healthStatus) {
        return getServiceHealthStatusColor(euiTheme, data.serviceAnomalyStats.healthStatus);
      }
      if (selected) {
        return euiTheme.colors.primary;
      }
      return euiTheme.colors.mediumShade;
    }, [data.serviceAnomalyStats?.healthStatus, selected, euiTheme]);

    const borderWidth = useMemo(() => {
      const status = data.serviceAnomalyStats?.healthStatus;
      if (status === ServiceHealthStatus.warning) return euiTheme.border.width.thick;
      if (status === ServiceHealthStatus.critical) return euiTheme.border.width.thick;
      return euiTheme.border.width.thick;
    }, [data.serviceAnomalyStats?.healthStatus, euiTheme.border.width.thick]);

    const iconUrl = useMemo(() => {
      if (data.agentName) {
        return getAgentIcon(data.agentName, isDarkMode);
      }
      return null;
    }, [data.agentName, isDarkMode]);

    const CIRCLE_SIZE = 56;

    const handleCollapseClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (data.groupId && data.onCollapseGroup) {
          data.onCollapseGroup(data.groupId);
        }
      },
      [data]
    );

    const ariaLabel = useMemo(() => {
      const parts = [
        i18n.translate('xpack.apm.serviceMap.serviceNode', {
          defaultMessage: 'Service: {serviceName}',
          values: { serviceName: data.label },
        }),
      ];

      if (data.agentName) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.agentType', {
            defaultMessage: 'Agent: {agentName}',
            values: { agentName: data.agentName },
          })
        );
      }

      if (data.serviceAnomalyStats?.healthStatus) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.healthStatus', {
            defaultMessage: 'Health status: {status}',
            values: { status: data.serviceAnomalyStats.healthStatus },
          })
        );
      }

      if (belongsToGroup && data.groupName) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.partOfGroup', {
            defaultMessage: 'Part of group: {groupName}',
            values: { groupName: data.groupName },
          })
        );
      }

      if (selected) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.selected', {
            defaultMessage: 'Selected',
          })
        );
      }

      return parts.join(', ');
    }, [
      data.label,
      data.agentName,
      data.serviceAnomalyStats?.healthStatus,
      data.groupName,
      belongsToGroup,
      selected,
    ]);

    const collapseTooltip = i18n.translate('xpack.apm.serviceMap.collapseGroup.tooltip', {
      defaultMessage: 'Collapse group: {groupName}',
      values: { groupName: data.groupName || 'services' },
    });

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={`serviceMapNode-service-${data.id}`}
      >
        {/* Circle container with handles inside for proper edge positioning */}
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            width: ${CIRCLE_SIZE}px;
            height: ${CIRCLE_SIZE}px;
          `}
        >
          <Handle
            type="target"
            position={targetPosition ?? Position.Left}
            css={css`
              visibility: hidden;
            `}
          />
          <div
            role="button"
            aria-label={ariaLabel}
            css={css`
              width: ${CIRCLE_SIZE}px;
              height: ${CIRCLE_SIZE}px;
              border-radius: 50%;
              border: ${borderWidth ?? euiTheme.border.width.thick} solid ${borderColor};
              background: ${euiTheme.colors.backgroundBasePlain};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
              cursor: pointer;
              pointer-events: all;
              [data-id]:focus &,
              [data-id]:focus-within & {
                outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
                outline-offset: 2px;
              }
            `}
          >
            {iconUrl && (
              <img
                src={iconUrl}
                alt={data.agentName}
                style={{ width: '60%', height: '60%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            )}
          </div>

          {/* Collapse badge - shown when node belongs to a group */}
          {belongsToGroup && data.onCollapseGroup && (
            <EuiToolTip content={collapseTooltip} position="top">
              <button
                type="button"
                onClick={handleCollapseClick}
                aria-label={collapseTooltip}
                data-test-subj={`serviceMapNode-collapse-${data.id}`}
                css={css`
                  position: absolute;
                  top: -4px;
                  right: -4px;
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  background: ${euiTheme.colors.backgroundBasePlain};
                  border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.mediumShade};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  padding: 0;
                  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
                  transition: transform 0.15s ease-in-out, background 0.15s ease-in-out;

                  &:hover {
                    transform: scale(1.1);
                    background: ${euiTheme.colors.lightShade};
                  }

                  &:focus {
                    outline: ${euiTheme.border.width.thin} solid ${euiTheme.colors.primary};
                    outline-offset: 1px;
                  }
                `}
              >
                <EuiIcon type="minimize" size="s" color={euiTheme.colors.textSubdued} />
              </button>
            </EuiToolTip>
          )}

          <Handle
            type="source"
            position={sourcePosition ?? Position.Right}
            css={css`
              visibility: hidden;
            `}
          />
        </EuiFlexItem>
        {/* Label */}
        <EuiFlexItem
          grow={false}
          css={css`
            font-size: ${euiTheme.size.s};
            color: ${selected ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
            font-family: ${euiTheme.font.family};
            max-width: 200px;
            text-align: center;
            overflow: hidden;
            pointer-events: none;
          `}
        >
          {data.label}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ServiceNode.displayName = 'ServiceNode';
