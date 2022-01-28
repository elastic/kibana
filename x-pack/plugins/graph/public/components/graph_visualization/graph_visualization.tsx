/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, Fragment } from 'react';
import classNames from 'classnames';
import d3, { ZoomEvent } from 'd3';
import { isColorDark, hexToRgb } from '@elastic/eui';
import { Workspace, WorkspaceNode, TermIntersect, ControlType, WorkspaceEdge } from '../../types';
import { makeEdgeId, makeNodeId } from '../../services/persistence';

export interface GraphVisualizationProps {
  workspace: Workspace;
  onSetControl: (control: ControlType) => void;
  selectSelected: (node: WorkspaceNode) => void;
  onSetMergeCandidates: (terms: TermIntersect[]) => void;
  filteredIds: string[];
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

export function GraphVisualization({
  workspace,
  selectSelected,
  onSetControl,
  onSetMergeCandidates,
  filteredIds,
}: GraphVisualizationProps) {
  const svgRoot = useRef<SVGSVGElement | null>(null);

  const nodeClick = (n: WorkspaceNode, event: React.MouseEvent) => {
    // Drop the click if the node is in the filtered list
    if (filterSet.size && !filterSet.has(n.id)) {
      return;
    }
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

  const edgeClick = (edge: WorkspaceEdge, event: React.MouseEvent) => {
    if (filterSet.size && !filterSet.has(makeEdgeId(edge.source.id, edge.target.id))) {
      return;
    }

    if (!event.shiftKey) {
      const prevSelection = edge.isSelected;
      workspace.clearEdgeSelection();
      edge.isSelected = prevSelection;
    }

    if (!edge.isSelected) {
      workspace.addEdgeToSelection(edge);
    } else {
      workspace.removeEdgeFromSelection(edge);
    }
    onSetControl('edgeSelection');

    workspace.getAllIntersections(handleMergeCandidatesCallback, [edge.topSrc, edge.topTarget]);
  };

  const filterSet = new Set(filteredIds);

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
            workspace.edges.map((edge) => {
              const edgeId = makeEdgeId(edge.source.id, edge.target.id);
              return (
                <Fragment key={edgeId}>
                  <line
                    x1={edge.topSrc.kx}
                    y1={edge.topSrc.ky}
                    x2={edge.topTarget.kx}
                    y2={edge.topTarget.ky}
                    className={classNames('gphEdge', {
                      'gphEdge--selected': edge.isSelected,
                    })}
                    style={{
                      strokeWidth: edge.width,
                      opacity: !filterSet.size || filterSet.has(edgeId) ? 1 : 0.1,
                    }}
                    strokeLinecap="round"
                  />
                  <line
                    x1={edge.topSrc.kx}
                    y1={edge.topSrc.ky}
                    x2={edge.topTarget.kx}
                    y2={edge.topTarget.ky}
                    onClick={(e) => {
                      edgeClick(edge, e);
                    }}
                    className="gphEdge"
                    style={{
                      strokeWidth: Math.max(edge.width, 15),
                      fill: 'transparent',
                      opacity: 0,
                    }}
                  />
                </Fragment>
              );
            })}
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
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    'gphNode__circle--selected': node.isSelected,
                  })}
                  style={{
                    fill: node.color,
                    opacity: !filterSet.size || filterSet.has(node.id) ? 1 : 0.3,
                  }}
                />
                {node.icon && (
                  <text
                    className={classNames('fa gphNode__text', {
                      // eslint-disable-next-line @typescript-eslint/naming-convention
                      'gphNode__text--inverse': isColorDark(...hexToRgb(node.color)),
                    })}
                    transform="translate(0,5)"
                    textAnchor="middle"
                    x={node.kx}
                    y={node.ky}
                    opacity={!filterSet.size || filterSet.has(node.id) ? 1 : 0.1}
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
                    opacity={!filterSet.size || filterSet.has(node.id) ? 1 : 0.1}
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
