/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

/** Demo-only: parent node for subflow grouping (e.g. by agent name). Renders a container box with label. */
export interface SubflowGroupNodeData extends Record<string, unknown> {
  label: string;
  /** Optional 0-based index for alternating group colors from EUI theme. */
  groupIndex?: number;
}

type SubflowGroupNodeType = Node<SubflowGroupNodeData, 'group'>;

const GROUP_COLOR_KEYS = [
  'euiColorVis0',
  'euiColorVis1',
  'euiColorVis2',
  'euiColorVis3',
  'euiColorVis4',
  'euiColorVis5',
  'euiColorVis6',
  'euiColorVis7',
  'euiColorVis8',
  'euiColorVis9',
] as const;

function getGroupAccentColor(
  euiTheme: { colors: { vis?: Record<string, string>; lightShade: string } },
  index: number
): string {
  const vis = euiTheme.colors.vis as Record<string, string> | undefined;
  const key = GROUP_COLOR_KEYS[index % GROUP_COLOR_KEYS.length];
  return vis?.[key] ?? euiTheme.colors.lightShade;
}

export const SubflowGroupNode = memo(({ data, style }: NodeProps<SubflowGroupNodeType>) => {
  const { euiTheme } = useEuiTheme();
  const label = data?.label ?? 'Group';
  const width = (style?.width as number) ?? 280;
  const height = (style?.height as number) ?? 200;
  const groupIndex = (data?.groupIndex as number) ?? 0;
  const accentColor = getGroupAccentColor(euiTheme, groupIndex);
  const backgroundColor = `${accentColor}15`;

  const boxStyles = css`
    width: ${width}px;
    height: ${height}px;
    border: none;
    border-radius: ${euiTheme.border.radius.medium};
    background: ${backgroundColor};
    padding: ${euiTheme.size.m};
    box-sizing: border-box;
    box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.s} ${euiTheme.colors.shadow};
  `;

  const labelStyles = css`
    font-size: ${euiTheme.size.m};
    font-weight: 700;
    color: ${euiTheme.colors.text};
    margin-bottom: ${euiTheme.size.xs};
  `;

  return (
    <div css={boxStyles} data-test-subj={`subflowGroup-${label}`}>
      <div css={labelStyles}>{label}</div>
    </div>
  );
});

SubflowGroupNode.displayName = 'SubflowGroupNode';
