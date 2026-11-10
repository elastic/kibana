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
import {
  NODE_BORDER_WIDTH_DEFAULT,
  SERVICE_NODE_CIRCLE_SIZE,
} from '../../../common/service_map/constants';
import { getSeverityColor } from '../../../common/anomaly_detection';
import { NodeLabel } from '../../components/shared/service_map/node_label';
import type { ImpactServiceNodeData } from './transform_impact_map';

/**
 * A service circle when APM has no agent logo: the type glyph sits inside the same circle that
 * would have held the logo. Never an empty ring with a floated icon on top — that clipped into a
 * square-over-arc mess.
 */
export const ServiceGlyphNode = memo(
  ({ data, sourcePosition, targetPosition }: NodeProps<Node<ImpactServiceNodeData>>) => {
    const { euiTheme } = useEuiTheme();
    const borderColor =
      data.serviceAnomalyStats?.anomalyScore !== undefined
        ? getSeverityColor(data.serviceAnomalyStats.anomalyScore)
        : euiTheme.colors.mediumShade;

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={`serviceMapNode-service-${data.id}`}
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
            border: ${NODE_BORDER_WIDTH_DEFAULT}px solid ${borderColor};
            border-radius: 50%;
            background: ${euiTheme.colors.backgroundBasePlain};
            box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs}
              ${euiTheme.colors.backgroundBaseSubdued};
            color: ${euiTheme.colors.textParagraph};
          `}
        >
          <Handle
            type="target"
            position={targetPosition ?? Position.Left}
            css={css`
              visibility: hidden;
            `}
          />
          <EuiIcon
            type={data.euiIcon ?? 'apps'}
            size="xl"
            aria-hidden="true"
            data-test-subj="impactMapServiceFallbackIcon"
          />
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
ServiceGlyphNode.displayName = 'ServiceGlyphNode';
