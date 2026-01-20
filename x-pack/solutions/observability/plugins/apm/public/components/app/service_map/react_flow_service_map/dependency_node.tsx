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
import { i18n } from '@kbn/i18n';

interface DependencyMapNodeData extends Record<string, any> {
  id: string;
  label: string;
  spanType: string;
  spanSubtype: string;
}

// Diamond dimensions
const DIAMOND_SIZE = 48;
// When rotated 45deg, the diagonal becomes the width/height: size * sqrt(2)
const DIAMOND_VISUAL_SIZE = Math.ceil(DIAMOND_SIZE * Math.SQRT2);

export const DependencyNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<Node<DependencyMapNodeData>>) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = euiTheme.colors.mediumShade;

    const iconUrl = useMemo(() => {
      if (data.spanType || data.spanSubtype) {
        return getSpanIcon(data.spanType, data.spanSubtype);
      }
      return null;
    }, [data.spanType, data.spanSubtype]);

    const ariaLabel = useMemo(() => {
      const parts = [
        i18n.translate('xpack.apm.serviceMap.dependencyNode', {
          defaultMessage: 'Dependency: {dependencyName}',
          values: { dependencyName: data.label },
        }),
      ];

      if (data.spanType) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.spanType', {
            defaultMessage: 'Type: {spanType}',
            values: { spanType: data.spanType },
          })
        );
      }

      if (data.spanSubtype) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.spanSubtype', {
            defaultMessage: 'Subtype: {spanSubtype}',
            values: { spanSubtype: data.spanSubtype },
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
    }, [data.label, data.spanType, data.spanSubtype, selected]);

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
            role="button"
            aria-label={ariaLabel}
            css={css`
              width: ${DIAMOND_SIZE}px;
              height: ${DIAMOND_SIZE}px;
              transform: rotate(45deg);
              border: ${euiTheme.border.width.thick} solid ${borderColor};
              background: ${euiTheme.colors.backgroundBasePlain};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
              box-sizing: border-box;
              cursor: pointer;
              pointer-events: all;
              /* Show blue outline when keyboard focused */
              [data-id]:focus-within & {
                outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
                outline-offset: 2px;
              }
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
                  alt={data.spanType || data.spanSubtype || 'dependency'}
                  aria-hidden="true"
                  css={css`
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                    pointer-events: none;
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
            pointer-events: none;
          `}
        >
          {data.label}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

DependencyNode.displayName = 'DependencyNode';
