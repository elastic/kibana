/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkspaceNode, WorkspaceEdge } from '../types';

export interface GraphVisualizationProps {
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  onNodeClick: (node: WorkspaceNode, event: React.MouseEvent) => void;
  onEdgeClick: (edge: WorkspaceEdge, event: React.MouseEvent) => void;
  onEdgeHover?: (edge: WorkspaceEdge, event: React.MouseEvent) => void;
}
