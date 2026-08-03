/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapEdge } from '../../../../common/service_map';

export const mkEdge = (id: string, source: string, target: string): ServiceMapEdge =>
  ({
    id,
    source,
    target,
    type: 'default',
    style: { stroke: '#ccc', strokeWidth: 1 },
    markerEnd: {
      type: 'arrowclosed',
      width: 10,
      height: 10,
      color: '#ccc',
    },
    data: { isBidirectional: false },
  } as ServiceMapEdge);
