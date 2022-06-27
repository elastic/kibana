/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { isColorDark, hexToRgb } from '@elastic/eui';
import { Workspace, WorkspaceNode, TermIntersect, ControlType, WorkspaceEdge } from '../../types';
import { makeNodeId } from '../../services/persistence';

export interface GraphVisualizationProps {
  workspace: Workspace;
  onSetControl: (control: ControlType) => void;
  selectSelected: (node: WorkspaceNode) => void;
  onSetMergeCandidates: (terms: TermIntersect[]) => void;
}

function registerZooming(element: SVGSVGElement) {
  const blockScroll = function () {
    (d3.event as Event).preventDefault();
  };
  d3.select(element)
    .on('mousewheel', blockScroll)
    .on('DOMMouseScroll', blockScroll)
    .call(
      d3.behavior.zoom().on('zoom', () => {
        const event = d3.event as ZoomEvent;
        d3.select(element)
          .select('g')
          .attr('transform', 'translate(' + event.translate + ')' + 'scale(' + event.scale + ')')
          .attr('style', 'stroke-width: ' + 1 / event.scale);
      })
    );
}

function makeEdgeId(edge: WorkspaceEdge) {
  return `${makeNodeId(edge.source.data.field, edge.source.data.term)}-${makeNodeId(
    edge.target.data.field,
    edge.target.data.term
  )}`;
}

export function GraphVisualization({
  workspace,
  selectSelected,
  onSetControl,
  onSetMergeCandidates,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);

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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="gphGraph"
      width="100%"
      height="100%"
      pointerEvents="all"
      id="graphSvg"
      ref={(element) => {
        if (element && svgRoot.current !== element) {
          svgRoot.current = element;
          registerZooming(element);
        }
      }}
    >
      <g>
        <g>
          {workspace.edges &&
            workspace.edges.map((edge) => (
              <g key={makeEdgeId(edge)} className="gphEdge--wrapper">
                {/* Draw two edges: a thicker one for better click handling and the one to show the user */}
                <line
                  x1={edge.topSrc.kx}
                  y1={edge.topSrc.ky}
                  x2={edge.topTarget.kx}
                  y2={edge.topTarget.ky}
                  className={classNames('gphEdge', {
                    'gphEdge--selected': edge.isSelected,
                  })}
                  strokeLinecap="round"
                  style={{ strokeWidth: edge.width }}
                />
                <line
                  x1={edge.topSrc.kx}
                  y1={edge.topSrc.ky}
                  x2={edge.topTarget.kx}
                  y2={edge.topTarget.ky}
                  onClick={() => {
                    edgeClick(edge);
                  }}
                  className="gphEdge gphEdge--clickable"
                  style={{
                    strokeWidth: Math.max(edge.width, 15),
                  }}
                />
              </g>
            ))}
        </g>
        {workspace.nodes &&
          workspace.nodes
            .filter((node) => !node.parent)
            .map((node) => (
              <g
                key={makeNodeId(node.data.field, node.data.term)}
                onClick={(e) => {
                  nodeClick(node, e);
                }}
                onMouseDown={(e) => {
                  // avoid selecting text when selecting nodes
                  if (e.ctrlKey || e.shiftKey) {
                    e.preventDefault();
                  }
                }}
                className="gphNode"
              >
                <circle
                  cx={node.kx}
                  cy={node.ky}
                  r={node.scaledSize}
                  className={classNames('gphNode__circle', {
                    'gphNode__circle--selected': node.isSelected,
                  })}
                  style={{ fill: node.color }}
                />
                {node.icon && (
                  <text
                    className={classNames('fa gphNode__text', {
                      'gphNode__text--inverse': isColorDark(...hexToRgb(node.color)),
                    })}
                    transform="translate(0,5)"
                    textAnchor="middle"
                    x={node.kx}
                    y={node.ky}
                  >
                    {node.icon.code}
                  </text>
                )}

                {node.label.length < 30 && (
                  <text
                    className="gphNode__label"
                    textAnchor="middle"
                    transform="translate(0,22)"
                    x={node.kx}
                    y={node.ky}
                  >
                    {node.label}
                  </text>
                )}
                {node.label.length >= 30 && (
                  <foreignObject
                    width="100"
                    height="20"
                    transform="translate(-50,15)"
                    x={node.kx}
                    y={node.ky}
                  >
                    <p className="gphNode__label gphNode__label--html gphNoUserSelect">
                      {node.label}
                    </p>
                  </foreignObject>
                )}

                {node.numChildren > 0 && (
                  <g>
                    <circle
                      r="5"
                      className="gphNode__markerCircle"
                      transform="translate(10,10)"
                      cx={node.kx}
                      cy={node.ky}
                    />
                    <text
                      className="gphNode__markerText"
                      textAnchor="middle"
                      transform="translate(10,12)"
                      x={node.kx}
                      y={node.ky}
                    >
                      {node.numChildren}
                    </text>
                  </g>
                )}
              </g>
            ))}
      </g>
    </svg>
  );
}
