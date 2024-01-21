/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useState } from 'react';
import { SnapshotNode } from '../../../../../common/http_api';

function useSnapshotMode() {
  const [interval, setInterval] = useState('60s');
  const [nodes, setNodes] = useState<SnapshotNode[]>([]);

  return {
    nodes,
    setNodes,
    interval,
    setInterval,
  };
}

export const [SnapshotModeProvider, useSnapshotModeContext] = createContainer(useSnapshotMode);
