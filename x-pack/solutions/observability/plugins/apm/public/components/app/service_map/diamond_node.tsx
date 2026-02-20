/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getSpanIcon } from '@kbn/apm-ui-shared';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  DEPENDENCY_NODE_DIAMOND_CONTAINER_SIZE,
  DEPENDENCY_NODE_DIAMOND_SIZE,
  NODE_BORDER_WIDTH_DEFAULT,
  NODE_BORDER_WIDTH_SELECTED,
} from '../../../../common/service_map/constants';
import { NodeLabel } from './node_label';

interface DiamondNodeProps {
  id: string;
  label: string;
  spanType?: string;
  spanSubtype?: string;
  selected?: boolean;
  sourcePosition?: Position;
  targetPosition?: Position;
  testSubjPrefix: string;
  iconAltFallback: string;
  badge?: ReactNode;
  ariaLabel?: string;
  groupedCount?: number;
}

export const DiamondNode = memo(
  ({
    id,
    label,
    spanType,
    spanSubtype,
    selected,
    sourcePosition,
    targetPosition,
    testSubjPrefix,
    iconAltFallback,
    badge,
    ariaLabel: customAriaLabel,
    groupedCount,
  }: DiamondNodeProps) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade;
    const diamondBorderWidth = selected
      ? `${NODE_BORDER_WIDTH_SELECTED}px`
      : `${NODE_BORDER_WIDTH_DEFAULT}px`;

    const iconUrl = useMemo(() => {
      if (spanType || spanSubtype) {
        return getSpanIcon(spanType, spanSubtype);
      }
      return null;
    }, [spanType, spanSubtype]);

    const ariaLabel = useMemo(() => {
      if (customAriaLabel) {
        return customAriaLabel;
      }

      const parts = [
        i18n.translate('xpack.apm.serviceMap.dependencyNode.ariaLabel', {
          defaultMessage: 'Dependency: {dependencyName}',
          values: { dependencyName: label },
        }),
      ];

      if (groupedCount && groupedCount > 1) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.dependencyNode.groupedCount', {
            defaultMessage: 'Contains {count} resources',
            values: { count: groupedCount },
          })
        );
      }

      if (spanType) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.dependencyNode.typeInfo', {
            defaultMessage: 'Type: {spanType}',
            values: { spanType },
          })
        );
      }

      if (spanSubtype) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.dependencyNode.subtypeInfo', {
            defaultMessage: 'Subtype: {spanSubtype}',
            values: { spanSubtype },
          })
        );
      }

      return parts.join('. ');
    }, [customAriaLabel, label, spanType, spanSubtype, groupedCount]);

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
      border: ${diamondBorderWidth} solid ${borderColor};
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs} ${euiTheme.colors.lightShade};
      box-sizing: border-box;
      cursor: pointer;
      pointer-events: all;

      &:focus-visible {
        outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
        outline-offset: ${euiTheme.size.xxs};
      }

      [data-id]:focus &,
      [data-id]:focus-visible & {
        outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
        outline-offset: ${euiTheme.size.xxs};
      }
    `;

    const iconContainerStyles = css`
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const iconStyles = css`
      width: 20px;
      height: 20px;
      object-fit: contain;
      pointer-events: none;
      display: block;
    `;

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={`serviceMapNode-${testSubjPrefix}-${id}`}
      >
        <EuiFlexItem grow={false} css={containerStyles}>
          <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
          {badge}
          <div
            css={diamondStyles}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-pressed={selected}
          >
            <div css={iconContainerStyles}>
              {iconUrl && (
                <img
                  src={iconUrl}
                  alt={spanType || spanSubtype || iconAltFallback}
                  css={iconStyles}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          <Handle type="source" position={sourcePosition ?? Position.Right} css={handleStyles} />
        </EuiFlexItem>
        <NodeLabel label={label} selected={selected} />
      </EuiFlexGroup>
    );
  }
);

DiamondNode.displayName = 'DiamondNode';
