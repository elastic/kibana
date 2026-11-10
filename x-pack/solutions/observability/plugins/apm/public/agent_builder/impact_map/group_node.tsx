/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getSeverityColor } from '../../../common/anomaly_detection';
import { EntityTypeTooltip } from './entity_type_tooltip';
import type { ImpactGroupNodeData } from './transform_impact_map';

/**
 * An entity that other entities sit inside (a zone, a region, a cluster, a business service),
 * drawn as a labelled box behind its members, like a Mermaid subgraph. It is an entity like any
 * other, so it carries its own icon, impact and events.
 */
export const GroupNode = memo(
  ({ data, sourcePosition, targetPosition }: NodeProps<Node<ImpactGroupNodeData>>) => {
    const { euiTheme } = useEuiTheme();
    // Boxes stay quiet by default so nested regions do not stack red borders; only a root-cause
    // group (severityScore set by the transform) takes the severity colour.
    const isRootCause = data.severityScore !== undefined;
    const borderColor = isRootCause
      ? getSeverityColor(data.severityScore!)
      : euiTheme.colors.mediumShade;
    return (
      <div
        data-test-subj={`impactMapGroup-${data.id}`}
        css={css`
          position: relative;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border: 2px ${isRootCause ? 'solid' : 'dashed'} ${borderColor};
          border-radius: ${euiTheme.border.radius.medium};
          background: ${euiTheme.colors.backgroundBaseSubdued};
          /* The box sits under its members; without this, clicks on a member hit the box instead. */
          pointer-events: none;
        `}
      >
        <Handle
          type="target"
          position={targetPosition ?? Position.Left}
          css={css`
            visibility: hidden;
          `}
        />
        <EntityTypeTooltip typeKindLabel={data.typeKindLabel} subtypeLabel={data.subtypeLabel}>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            className="impactMapGroupHeader"
            css={css`
              padding: ${euiTheme.size.s} ${euiTheme.size.m};
              /* Only the title receives clicks, so the group itself can still open. */
              pointer-events: auto;
            `}
          >
            {data.euiIcon && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={data.euiIcon} size="m" aria-hidden="true" />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{data.label}</strong>
              </EuiText>
            </EuiFlexItem>
            {data.eventCount ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary" data-test-subj="impactMapEventCount">
                  {data.eventCount}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EntityTypeTooltip>
        <Handle
          type="source"
          position={sourcePosition ?? Position.Right}
          css={css`
            visibility: hidden;
          `}
        />
      </div>
    );
  }
);
GroupNode.displayName = 'GroupNode';
