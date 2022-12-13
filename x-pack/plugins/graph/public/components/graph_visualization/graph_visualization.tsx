/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  Workspace,
  WorkspaceNode,
  TermIntersect,
  ControlType,
  WorkspaceEdge,
} from '../../types';
import { D3GraphRenderer } from '../../renderer/d3/d3_based';

export interface GraphVisualizationProps {
  workspace: Workspace;
  onSetControl: (control: ControlType) => void;
  selectSelected: (node: WorkspaceNode) => void;
  onSetMergeCandidates: (terms: TermIntersect[]) => void;
}

export function GraphVisualization({
  workspace,
  selectSelected,
  onSetControl,
  onSetMergeCandidates,
}: GraphVisualizationProps) {
  const nodeClick = (n: WorkspaceNode, event: React.MouseEvent) => {
    // Selection logic - shift key+click helps selects multiple nodes
    // Without the shift key we deselect all prior selections (perhaps not
    // a great idea for touch devices with no concept of shift key)
    if (!event.shiftKey) {
      const prevSelection = n.isSelected;
      workspace.selectNone();
      n.isSelected = prevSelection;
    }
    if (workspace.toggleNodeSelection(n)) {
      selectSelected(n);
    } else {
      onSetControl('none');
    }
    workspace.changeHandler();
  };

  const handleMergeCandidatesCallback = (termIntersects: TermIntersect[]) => {
    const mergeCandidates: TermIntersect[] = [...termIntersects];
    onSetMergeCandidates(mergeCandidates);
    onSetControl('mergeTerms');
  };

  const edgeClick = (edge: WorkspaceEdge) => {
    // no multiple selection for now
    const currentSelection = workspace.getEdgeSelection();
    if (currentSelection.length && currentSelection[0] !== edge) {
      workspace.clearEdgeSelection();
    }
    if (!edge.isSelected) {
      workspace.addEdgeToSelection(edge);
    } else {
      workspace.removeEdgeFromSelection(edge);
    }
    onSetControl('edgeSelection');

    if (edge.isSelected) {
      workspace.getAllIntersections(handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);
    }
  };

  return (
    <D3GraphRenderer
      nodes={workspace.nodes}
      edges={workspace.edges}
      onNodeClick={nodeClick}
      onEdgeClick={edgeClick}
    />
  );
}
