/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SERVICE_NODE_CIRCLE_SIZE } from '../../../common/service_map/constants';
import { getSeverityColor } from '../../../common/anomaly_detection';
import { NodeLabel } from '../../components/shared/service_map/node_label';
import type { ImpactDependencyNodeData } from './transform_impact_map';

/**
 * What runs and hosts the services (Kubernetes objects, hosts, containers, cloud resources) draws
 * as a rounded square, so it reads differently from a service circle and a dependency diamond.
 * The icon sits inside the square's own flex box, so it is always centred.
 */
export const InfrastructureNode = memo(
  ({ data, sourcePosition, targetPosition }: NodeProps<Node<ImpactDependencyNodeData>>) => {
    const { euiTheme } = useEuiTheme();
    const borderColor =
      data.severityScore !== undefined
        ? getSeverityColor(data.severityScore)
        : euiTheme.colors.mediumShade;

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="xs"
        responsive={false}
        data-test-subj={`serviceMapNode-impactInfrastructure-${data.id}`}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            width: ${SERVICE_NODE_CIRCLE_SIZE}px;
            height: ${SERVICE_NODE_CIRCLE_SIZE}px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            border: 3px solid ${borderColor};
            border-radius: ${euiTheme.border.radius.medium};
            background: ${euiTheme.colors.backgroundBasePlain};
            box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs}
              ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <Handle
            type="target"
            position={targetPosition ?? Position.Left}
            css={css`
              visibility: hidden;
            `}
          />
          <EuiIcon type={data.euiIcon ?? 'compute'} size="xl" aria-hidden="true" />
          <Handle
            type="source"
            position={sourcePosition ?? Position.Right}
            css={css`
              visibility: hidden;
            `}
          />
        </EuiFlexItem>
        <NodeLabel label={data.label} />
      </EuiFlexGroup>
    );
  }
);
InfrastructureNode.displayName = 'InfrastructureNode';
