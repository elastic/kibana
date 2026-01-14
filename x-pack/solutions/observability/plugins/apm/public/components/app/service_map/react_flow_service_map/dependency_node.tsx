/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, transparentize, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getSpanIcon } from '@kbn/apm-ui-shared';
import { css } from '@emotion/react';
import type { SpanType, SpanSubtype } from '../../../../../common/es_fields/apm';

interface DependencyMapNodeData {
  id: string;
  label: string;
  spanType?: SpanType;
  spanSubtype?: SpanSubtype;
}

// Diamond dimensions
const DIAMOND_SIZE = 48;
// When rotated 45deg, the diagonal becomes the width/height: size * sqrt(2)
const DIAMOND_VISUAL_SIZE = Math.ceil(DIAMOND_SIZE * Math.SQRT2);

export const DependencyNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<Node<DependencyMapNodeData>>) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

    const iconUrl = useMemo(() => {
      if (data.spanType || data.spanSubtype) {
        return getSpanIcon(data.spanType, data.spanSubtype);
      }
      return null;
    }, [data.spanType, data.spanSubtype]);

    return (
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
        {/* Container sized for the rotated diamond visual */}
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            width: ${DIAMOND_VISUAL_SIZE}px;
            height: ${DIAMOND_VISUAL_SIZE}px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <Handle
            type="target"
            position={targetPosition ?? Position.Left}
            css={css`
              visibility: hidden;
            `}
          />
          {/* Diamond shape - using div to avoid EuiFlexGroup padding affecting the shape */}
          <div
            css={css`
              width: ${DIAMOND_SIZE}px;
              height: ${DIAMOND_SIZE}px;
              transform: rotate(45deg);
              border: ${euiTheme.border.width.medium} solid ${borderColor};
              background: ${euiTheme.colors.backgroundBasePlain};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
              box-sizing: border-box;
              cursor: pointer;
            `}
          >
            <div
              css={css`
                transform: rotate(-45deg);
              `}
            >
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt={data.spanSubtype || data.spanType || 'dependency'}
                  css={css`
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                  `}
                />
              )}
            </div>
          </div>
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
            text-overflow: ellipsis;
            white-space: nowrap;
            background-color: ${selected
              ? transparentize(euiTheme.colors.primary, 0.1)
              : 'transparent'};
            padding: ${euiTheme.size.xs};
            border-radius: ${euiTheme.border.radius.medium};
          `}
        >
          {data.label}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

DependencyNode.displayName = 'DependencyNode';
