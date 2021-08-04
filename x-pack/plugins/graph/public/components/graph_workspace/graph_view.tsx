/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { isColorDark, hexToRgb } from '@elastic/eui';
import {
  GroupAwareWorkspaceEdge,
  GroupAwareWorkspaceNode,
  TermIntersect,
  Workspace,
  WorkspaceNode,
} from '../../types';
import { GraphVisualization } from '../graph_visualization';
import { ControlPanel, Detail } from '../control_panel';
import { colorChoices } from '../../helpers/style_choices';

interface GraphViewProps {
  workspace: Workspace;
}

export const GraphView = ({ workspace }: GraphViewProps) => {
  const [detail, setDetail] = useState<Detail>();
  const [selectedSelectedVertex, setSelectedSelectedVertex] = useState<WorkspaceNode>();

  const selectSelected = useCallback((node: WorkspaceNode) => {
    setDetail({ latestNodeSelection: node });
    setSelectedSelectedVertex(node);
  }, []);

  const handleMergeCandidatesCallback = useCallback((termIntersects: TermIntersect[]) => {
    const mergeCandidates: TermIntersect[] = [];
    termIntersects.forEach((ti) => {
      mergeCandidates.push({
        id1: ti.id1,
        id2: ti.id2,
        term1: ti.term1,
        term2: ti.term2,
        v1: ti.v1,
        v2: ti.v2,
        overlap: ti.overlap,
      });
    });
    setDetail({ mergeCandidates });
  }, []);

  const clickEdge = useCallback(
    (edge: GroupAwareWorkspaceEdge) => {
      workspace.getAllIntersections(handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);
    },
    [workspace, handleMergeCandidatesCallback]
  );

  const nodeClick = useCallback(
    (n: GroupAwareWorkspaceNode, event: React.MouseEvent) => {
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
        setDetail(undefined);
      }
    },
    [selectSelected, workspace]
  );

  const isSelectedSelected = useCallback((node: WorkspaceNode) => selectedSelectedVertex === node, [
    selectedSelectedVertex,
  ]);

  const isHexColorDark = useCallback((color) => isColorDark(...hexToRgb(color)), []);

  return (
    <div className="gphGraph__container" id="GraphSvgContainer">
      <div className="gphVisualization">
        <GraphVisualization
          edges={workspace.edges as GroupAwareWorkspaceEdge[]}
          nodes={workspace.nodes as GroupAwareWorkspaceNode[]}
          edgeClick={clickEdge}
          nodeClick={nodeClick}
        />
      </div>

      <ControlPanel
        workspace={workspace}
        setDetail={setDetail}
        isSelectedSelected={isSelectedSelected}
        isColorDark={isHexColorDark}
        detail={detail}
        colors={colorChoices}
        selectSelected={selectSelected}
      />
    </div>
  );
};
