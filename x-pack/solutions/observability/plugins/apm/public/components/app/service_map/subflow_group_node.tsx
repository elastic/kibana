/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ServiceMapNode, SubflowGroupNodeData } from '../../../../common/service_map';

const SUBFLOW_GROUP_PADDING = 24;
const SUBFLOW_GROUP_BORDER_WIDTH = 2;

export const SubflowGroupNode = memo(({ data }: NodeProps<ServiceMapNode>) => {
  const { euiTheme } = useEuiTheme();
  const nodeData = data as SubflowGroupNodeData;
  if (!nodeData || !('isSubflowGroup' in nodeData) || !nodeData.isSubflowGroup) {
    return null;
  }
  const { label, groupKey, color, width, height } = nodeData;
  const safeWidth = typeof width === 'number' ? width : 200;
  const safeHeight = typeof height === 'number' ? height : 100;
  const shadowColor = euiTheme.colors?.shadow ?? 'rgba(0,0,0,0.1)';
  const sizeXs = euiTheme.size?.xs ?? '4px';
  const sizeS = euiTheme.size?.s ?? '8px';
  const sizeM = euiTheme.size?.m ?? '12px';

  /* Background: same as border color but faded (opacity) for a subtle fill */
  const backgroundFaded = `color-mix(in srgb, ${color} 14%, transparent)`;

  const containerStyle = css`
    width: ${safeWidth}px;
    height: ${safeHeight}px;
    border: ${SUBFLOW_GROUP_BORDER_WIDTH}px solid ${color};
    border-radius: ${euiTheme.border?.radius?.medium ?? '6px'};
    background: ${backgroundFaded};
    box-shadow: 0 ${sizeXs} ${sizeS} ${shadowColor};
    padding: ${SUBFLOW_GROUP_PADDING}px;
    box-sizing: border-box;
    overflow: visible;
  `;

  const headerStyle = css`
    position: absolute;
    top: -${sizeS};
    left: ${sizeM};
    padding: 0 ${sizeXs};
    background: ${backgroundFaded};
    border: 1px solid ${color};
    border-radius: ${euiTheme.border?.radius?.small ?? '4px'};
  `;

  return (
    <div
      css={containerStyle}
      data-test-subj="serviceMapSubflowGroup"
      data-group-key={groupKey}
      role="group"
      aria-label={label}
    >
      <div css={headerStyle}>
        <EuiText size="xs" color="subdued">
          <strong>{label || groupKey}</strong>
        </EuiText>
      </div>
    </div>
  );
});

SubflowGroupNode.displayName = 'SubflowGroupNode';
