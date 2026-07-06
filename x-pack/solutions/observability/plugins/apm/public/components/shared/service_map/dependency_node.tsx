/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import type { DependencyNodeData } from '../../../../common/service_map';
import { DiamondNode } from './diamond_node';

type DependencyNodeType = Node<DependencyNodeData, 'dependency'>;

export const DependencyNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<DependencyNodeType>) => {
    return (
      <DiamondNode
        id={data.id}
        label={data.label}
        spanType={data.spanType}
        spanSubtype={data.spanSubtype}
        selected={selected}
        sourcePosition={sourcePosition}
        targetPosition={targetPosition}
        testSubjPrefix="dependency"
        iconAltFallback="dependency"
      />
    );
  }
);

DependencyNode.displayName = 'DependencyNode';
