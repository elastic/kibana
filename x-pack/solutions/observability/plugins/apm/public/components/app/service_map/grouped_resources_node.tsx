/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { GroupedNodeData } from '../../../../common/service_map';
import { DiamondNode } from './diamond_node';

type GroupedResourcesNodeType = Node<GroupedNodeData, 'groupedResources'>;

export const GroupedResourcesNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<GroupedResourcesNodeType>) => {
    const { euiTheme } = useEuiTheme();

    const badgeStyles = css`
      position: absolute;
      top: -${euiTheme.size.xs};
      right: -${euiTheme.size.xs};
      border: ${euiTheme.border.width.thin} solid
        ${selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade};
      z-index: ${euiTheme.levels.header};
    `;

    return (
      <DiamondNode
        id={data.id}
        label={data.label}
        spanType={data.spanType}
        spanSubtype={data.spanSubtype}
        selected={selected}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        testSubjPrefix="groupedResources"
        iconAltFallback="grouped resources"
        groupedCount={data.count}
        badge={
          <EuiBadge color="hollow" css={badgeStyles}>
            {data.count}
          </EuiBadge>
        }
      />
    );
  }
);

GroupedResourcesNode.displayName = 'GroupedResourcesNode';
