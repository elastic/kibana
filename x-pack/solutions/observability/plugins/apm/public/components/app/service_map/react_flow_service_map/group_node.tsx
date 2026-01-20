/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { GroupNodeData } from './use_expand_collapse';

// Group node dimensions (larger than regular nodes to indicate it contains multiple services)
const GROUP_SIZE = 72;

/**
 * GroupNode component represents a collapsed group of services.
 * When clicked, it expands to show the individual services within the group.
 *
 * Visual design: A stacked/layered circle effect to indicate multiple services
 */
export const GroupNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<Node<GroupNodeData>>) => {
    const { euiTheme } = useEuiTheme();

    const borderColor = selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade;

    const ariaLabel = useMemo(() => {
      return i18n.translate('xpack.apm.serviceMap.groupNode', {
        defaultMessage: 'Service group: {groupName} containing {count} services. Click to expand.',
        values: {
          groupName: data.label,
          count: data.childCount,
        },
      });
    }, [data.label, data.childCount]);

    const tooltipContent = i18n.translate('xpack.apm.serviceMap.groupNode.tooltip', {
      defaultMessage: 'Click to expand {count} services',
      values: { count: data.childCount },
    });

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={`serviceMapNode-group-${data.id}`}
      >
        {/* Stacked circle container to show it's a group */}
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            width: ${GROUP_SIZE}px;
            height: ${GROUP_SIZE}px;
          `}
        >
          <Handle
            type="target"
            position={targetPosition ?? Position.Left}
            css={css`
              visibility: hidden;
            `}
          />

          {/* Background circles to create stacked effect */}
          <div
            css={css`
              position: absolute;
              top: 4px;
              left: 4px;
              width: ${GROUP_SIZE - 8}px;
              height: ${GROUP_SIZE - 8}px;
              border-radius: 50%;
              background: ${euiTheme.colors.lightShade};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.mediumShade};
            `}
          />
          <div
            css={css`
              position: absolute;
              top: 2px;
              left: 2px;
              width: ${GROUP_SIZE - 4}px;
              height: ${GROUP_SIZE - 4}px;
              border-radius: 50%;
              background: ${euiTheme.colors.lightShade};
              border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.mediumShade};
            `}
          />

          {/* Main circle with expand icon */}
          <EuiToolTip content={tooltipContent} position="top">
            <div
              role="button"
              aria-label={ariaLabel}
              css={css`
                position: relative;
                width: ${GROUP_SIZE}px;
                height: ${GROUP_SIZE}px;
                border-radius: 50%;
                border: ${euiTheme.border.width.thick} solid ${borderColor};
                background: ${euiTheme.colors.backgroundBasePlain};
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: ${euiTheme.size.xs};
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                cursor: pointer;
                pointer-events: all;
                transition: transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out;

                &:hover {
                  transform: scale(1.05);
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25);
                }

                [data-id]:focus &,
                [data-id]:focus-within & {
                  outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
                  outline-offset: 2px;
                }
              `}
            >
              {/* Count badge */}
              <span
                css={css`
                  font-size: ${euiTheme.size.m};
                  font-weight: ${euiTheme.font.weight.bold};
                  color: ${euiTheme.colors.textParagraph};
                  line-height: 1;
                `}
              >
                {data.childCount}
              </span>

              {/* Expand icon */}
              <EuiIcon
                type="expand"
                size="s"
                color={euiTheme.colors.textSubdued}
                css={css`
                  pointer-events: none;
                `}
              />
            </div>
          </EuiToolTip>

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
            font-weight: ${euiTheme.font.weight.medium};
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

GroupNode.displayName = 'GroupNode';
