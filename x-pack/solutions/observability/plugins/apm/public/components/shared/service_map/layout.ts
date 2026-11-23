/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge } from '@xyflow/react';
import {
  NODE_WIDTH,
  NODE_HEIGHT,
  RANK_SEPARATION,
  NODE_SEPARATION,
  GRAPH_MARGIN,
  FOLD_MIN_NODE_COUNT,
  FOLD_ASPECT_RATIO_THRESHOLD,
  FOLD_TARGET_ASPECT_RATIO,
  FOLD_MIN_LOCAL_EDGE_FRACTION,
  GROUP_BOX_PADDING,
  GROUP_BOX_HEADER_HEIGHT,
} from '../../../../common/service_map/constants';

export interface LayoutOptions {
  /** Direction of the graph layout */
  rankdir?: 'TB' | 'LR';
  /** Vertical spacing between ranks */
  ranksep?: number;
  /** Horizontal spacing between nodes */
  nodesep?: number;
  /** Margin around the graph */
  marginx?: number;
  marginy?: number;
  /** Width of nodes */
  nodeWidth?: number;
  /** Height of nodes */
  nodeHeight?: number;
}

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  rankdir: 'LR',
  ranksep: RANK_SEPARATION,
  nodesep: NODE_SEPARATION,
  marginx: GRAPH_MARGIN,
  marginy: GRAPH_MARGIN,
  nodeWidth: NODE_WIDTH,
  nodeHeight: NODE_HEIGHT,
};

/** Size of a node that differs from the default `nodeWidth` x `nodeHeight`, e.g. an open group's box. */
export interface NodeSize {
  width: number;
  height: number;
}

/** Sizes by node id; nodes that are not listed use the default size from the layout options. */
export type NodeSizes = ReadonlyMap<string, NodeSize>;

const getNodeSize = (
  nodeId: string,
  opts: Required<LayoutOptions>,
  nodeSizes?: NodeSizes
): NodeSize => nodeSizes?.get(nodeId) ?? { width: opts.nodeWidth, height: opts.nodeHeight };

function handlePositionsForRankdir(rankdir: 'TB' | 'LR') {
  return rankdir === 'TB'
    ? { sourcePosition: Position.Bottom, targetPosition: Position.Top }
    : { sourcePosition: Position.Right, targetPosition: Position.Left };
}

/**
 * Places nodes on a square grid when Dagre layout fails (e.g. rare internal dagre bugs).
 * Positions follow the **input array order** (index 0, 1, …), not graph topology—only
 * a last-resort layout so the map stays usable.
 */
export function applyGridFallbackLayout<T extends Node>(
  nodes: T[],
  opts: Required<LayoutOptions>,
  nodeSizes?: NodeSizes
): T[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const handles = handlePositionsForRankdir(opts.rankdir);

  // Each column is as wide as its widest node and each row as tall as its tallest, so a node that is
  // bigger than the default (an open group) does not overlap its neighbours.
  const columnWidths = new Array<number>(cols).fill(opts.nodeWidth);
  const rowHeights = new Array<number>(rows).fill(opts.nodeHeight);
  nodes.forEach((node, index) => {
    const { width, height } = getNodeSize(node.id, opts, nodeSizes);
    const col = index % cols;
    const row = Math.floor(index / cols);
    columnWidths[col] = Math.max(columnWidths[col], width);
    rowHeights[row] = Math.max(rowHeights[row], height);
  });

  const columnStarts: number[] = [];
  let xCursor = opts.marginx;
  for (const width of columnWidths) {
    columnStarts.push(xCursor);
    xCursor += width + opts.nodesep;
  }
  const rowStarts: number[] = [];
  let yCursor = opts.marginy;
  for (const height of rowHeights) {
    rowStarts.push(yCursor);
    yCursor += height + opts.ranksep;
  }

  return nodes.map((node, index) => ({
    ...node,
    ...handles,
    position: {
      x: Math.round(columnStarts[index % cols]),
      y: Math.round(rowStarts[Math.floor(index / cols)]),
    },
  }));
}

/**
 * Apply dagre layout to position nodes in a hierarchical layout.
 *
 * @param nodes - Array of React Flow nodes to position
 * @param edges - Array of React Flow edges defining connections
 * @param options - Optional layout configuration
 * @param onDagreLayoutFailure - Optional callback when Dagre throws (e.g. for telemetry)
 * @param nodeSizes - Optional sizes for nodes that are not the default size
 * @returns Array of nodes with calculated positions
 */
export function applyDagreLayout<T extends Node>(
  nodes: T[],
  edges: Edge[],
  options: LayoutOptions = {},
  onDagreLayoutFailure?: (error: unknown) => void,
  nodeSizes?: NodeSizes
): T[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const g = new Dagre.graphlib.Graph({ directed: true, compound: false })
    .setGraph({
      rankdir: opts.rankdir,
      ranksep: opts.ranksep,
      nodesep: opts.nodesep,
      marginx: opts.marginx,
      marginy: opts.marginy,
    })
    .setDefaultEdgeLabel(() => ({}));

  // Add nodes to dagre graph
  nodes.forEach((node) => {
    g.setNode(node.id, getNodeSize(node.id, opts, nodeSizes));
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  try {
    Dagre.layout(g);
  } catch (error) {
    onDagreLayoutFailure?.(error);
    return applyGridFallbackLayout(nodes, opts, nodeSizes);
  }

  // Apply calculated positions to nodes
  const handles = handlePositionsForRankdir(opts.rankdir);
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);

    if (!dagreNode) {
      return { ...node, ...handles };
    }

    const { width, height } = getNodeSize(node.id, opts, nodeSizes);
    return {
      ...node,
      ...handles,
      position: {
        x: Math.round(dagreNode.x - width / 2),
        y: Math.round(dagreNode.y - height / 2),
      },
    };
  });
}

/** Axis of a node position React Flow understands: `x` for LR folding, `y` for TB folding. */
type Axis = 'x' | 'y';

/**
 * Nodes of one Dagre rank share a centre on the rank axis, but their rounded top-left coordinates
 * differ when their sizes differ (or are odd), so ranks are told apart by centre with this tolerance.
 */
const LANE_CENTER_TOLERANCE = 1;

interface FoldGeometry {
  /** Rank index of every node, keyed by node id. */
  laneIndexByNodeId: Map<string, number>;
  /** Rank-axis size of each rank: that of its longest node (px). */
  laneAlong: number[];
  /** Long-axis extent of the Dagre layout (px). */
  along: number;
  /** Short-axis extent of the Dagre layout (px). */
  across: number;
}

/**
 * Measures the Dagre-positioned layout along the fold's primary (rank) axis and short axis, and
 * indexes nodes by rank. Returns `null` when there is nothing meaningful to fold (no spread on the
 * short axis), which keeps the caller's guard logic simple.
 */
function measureFoldGeometry<T extends Node>(
  nodes: T[],
  primary: Axis,
  cross: Axis,
  getAlong: (node: T) => number,
  getAcross: (node: T) => number
): FoldGeometry | null {
  let minAlong = Infinity;
  let maxAlong = -Infinity;
  let minAcross = Infinity;
  let maxAcross = -Infinity;

  for (const node of nodes) {
    const alongValue = node.position[primary];
    const acrossValue = node.position[cross];
    minAlong = Math.min(minAlong, alongValue);
    maxAlong = Math.max(maxAlong, alongValue + getAlong(node));
    minAcross = Math.min(minAcross, acrossValue);
    maxAcross = Math.max(maxAcross, acrossValue + getAcross(node));
  }

  const across = maxAcross - minAcross;
  if (across <= 0) {
    return null;
  }

  const byCenter = nodes
    .map((node) => ({ node, center: node.position[primary] + getAlong(node) / 2 }))
    .sort((a, b) => a.center - b.center);

  const laneIndexByNodeId = new Map<string, number>();
  const laneAlong: number[] = [];
  let laneCenter = -Infinity;
  for (const { node, center } of byCenter) {
    if (center - laneCenter > LANE_CENTER_TOLERANCE) {
      laneAlong.push(0);
      laneCenter = center;
    }
    const lane = laneAlong.length - 1;
    laneIndexByNodeId.set(node.id, lane);
    laneAlong[lane] = Math.max(laneAlong[lane], getAlong(node));
  }

  return { laneIndexByNodeId, laneAlong, along: maxAlong - minAlong, across };
}

/**
 * Fraction of edges (within the visible node set) whose endpoints sit on adjacent Dagre ranks.
 * Folding wraps the rank axis, so a high fraction means almost every edge stays a short hop after
 * folding; a low fraction means folding would stretch many edges into long diagonals.
 */
function localEdgeFraction(edges: Edge[], laneIndexByNodeId: Map<string, number>): number {
  let measured = 0;
  let local = 0;
  for (const { source, target } of edges) {
    const sourceLane = laneIndexByNodeId.get(source);
    const targetLane = laneIndexByNodeId.get(target);
    if (sourceLane === undefined || targetLane === undefined) {
      continue;
    }
    measured += 1;
    if (Math.abs(sourceLane - targetLane) <= 1) {
      local += 1;
    }
  }
  return measured === 0 ? 1 : local / measured;
}

/**
 * Picks how many ranks to place in each serpentine band so the folded *cell grid* — `lanesPerBand`
 * cells along the rank axis by `ceil(laneCount / lanesPerBand)` bands across it — comes out close to
 * {@link FOLD_TARGET_ASPECT_RATIO}. Treating every rank as one cell (`cellAlong` along, `cellAcross`
 * across), a square grid wants `lanesPerBand * cellAlong ≈ bandCount * cellAcross`; substituting
 * `bandCount ≈ laneCount / lanesPerBand` and the target ratio and solving gives the closed form
 * below.
 *
 * Deliberately ignores the measured per-band heights: a service map is often a long chain with a few
 * ranks that fan out far taller than the rest, and optimising the *measured* bounds would let those
 * tall ranks dominate the height and stretch every band back out into a near-straight line. Folding
 * by rank count keeps the serpentine compact regardless of such outliers.
 */
function chooseLanesPerBand(laneCount: number, cellAlong: number, cellAcross: number): number {
  const ideal = Math.sqrt((FOLD_TARGET_ASPECT_RATIO * laneCount * cellAcross) / cellAlong);
  return Math.min(laneCount, Math.max(1, Math.round(ideal)));
}

/**
 * Folds an already–Dagre-positioned layout into a serpentine of stacked bands when it is far more
 * elongated than {@link FOLD_TARGET_ASPECT_RATIO}. The rank (primary) axis is wrapped: the first
 * band runs in the primary direction, the next reverses, and so on, which trades the long axis for
 * the short one and brings the bounds close to square so the viewport fit zooms in much further.
 *
 * Within a band, nodes keep their Dagre short-axis positions, so a band looks like a slice of the
 * original layout (branches, parallel ranks and all) and its edges stay horizontal (LR) / vertical
 * (TB). Only the ranks at a band boundary get rotated handles so the single edge that crosses into
 * the next band turns cleanly; because those ranks are band extremes they have no in-band edge on
 * that side, so each node's lone source/target handle is unambiguous.
 *
 * Falls back to the input unchanged when the layout is already squarish, too small, or has too many
 * long-range edges to fold without creating long diagonals (see the `FOLD_*` constants).
 */
export function foldWideLayout<T extends Node>(
  nodes: T[],
  edges: Edge[],
  opts: Required<LayoutOptions>,
  nodeSizes?: NodeSizes
): T[] {
  if (nodes.length < FOLD_MIN_NODE_COUNT || nodes.some((node) => !node.position)) {
    return nodes;
  }

  const isVertical = opts.rankdir === 'TB';
  const primary: Axis = isVertical ? 'y' : 'x';
  const cross: Axis = isVertical ? 'x' : 'y';
  const getAlong = (node: T) => {
    const { width, height } = getNodeSize(node.id, opts, nodeSizes);
    return isVertical ? height : width;
  };
  const getAcross = (node: T) => {
    const { width, height } = getNodeSize(node.id, opts, nodeSizes);
    return isVertical ? width : height;
  };
  const defaultAcross = isVertical ? opts.nodeWidth : opts.nodeHeight;
  const bandGap = opts.ranksep;
  const cellAcross = defaultAcross + bandGap;
  const marginAlong = isVertical ? opts.marginy : opts.marginx;
  const marginCross = isVertical ? opts.marginx : opts.marginy;

  const geometry = measureFoldGeometry(nodes, primary, cross, getAlong, getAcross);
  if (!geometry) {
    return nodes;
  }

  const { laneIndexByNodeId, laneAlong, along, across } = geometry;
  const laneCount = laneAlong.length;
  if (along / across <= FOLD_ASPECT_RATIO_THRESHOLD) {
    return nodes;
  }

  if (localEdgeFraction(edges, laneIndexByNodeId) < FOLD_MIN_LOCAL_EDGE_FRACTION) {
    return nodes;
  }

  // Ranks that hold a big node (an open group) are longer than the rest, so a cell is as long as the
  // average rank; with all nodes at the default size this is the plain node size.
  const averageLaneAlong = laneAlong.reduce((sum, value) => sum + value, 0) / laneCount;
  const cellAlong = averageLaneAlong + opts.ranksep;

  const lanesPerBand = chooseLanesPerBand(laneCount, cellAlong, cellAcross);
  if (lanesPerBand >= laneCount) {
    return nodes;
  }

  // Per-rank short-axis extent. A band keeps the Dagre short-axis positions of its own ranks, so its
  // height is the extent of its tallest rank — most ranks are short, a few fan out tall — and that
  // measured height is what offsets each band from the next below.
  const laneMinCross = new Array<number>(laneCount).fill(Infinity);
  const laneMaxCross = new Array<number>(laneCount).fill(-Infinity);
  for (const node of nodes) {
    const lane = laneIndexByNodeId.get(node.id) ?? 0;
    const acrossValue = node.position[cross];
    laneMinCross[lane] = Math.min(laneMinCross[lane], acrossValue);
    laneMaxCross[lane] = Math.max(laneMaxCross[lane], acrossValue + getAcross(node));
  }

  const bandCount = Math.ceil(laneCount / lanesPerBand);
  const bandLaneCount = (band: number) => Math.min(lanesPerBand, laneCount - band * lanesPerBand);

  const bandMinCross = new Array(bandCount).fill(Infinity);
  const bandMaxCross = new Array(bandCount).fill(-Infinity);
  for (let lane = 0; lane < laneCount; lane++) {
    const band = Math.floor(lane / lanesPerBand);
    bandMinCross[band] = Math.min(bandMinCross[band], laneMinCross[lane]);
    bandMaxCross[band] = Math.max(bandMaxCross[band], laneMaxCross[lane]);
  }
  const bandCrossOffset = new Array(bandCount).fill(0);
  let crossCursor = marginCross;
  for (let band = 0; band < bandCount; band++) {
    bandCrossOffset[band] = crossCursor;
    crossCursor += bandMaxCross[band] - bandMinCross[band] + bandGap;
  }

  // Where each rank starts along the rank axis. Ranks are as long as their longest node and follow
  // each other in the band's own direction, so the ranks of a reversed band are placed back to front.
  const laneAlongStart = new Array<number>(laneCount).fill(0);
  for (let band = 0; band < bandCount; band++) {
    const firstLane = band * lanesPerBand;
    const lanesInBand = Array.from({ length: bandLaneCount(band) }, (_, i) => firstLane + i);
    if (band % 2 === 1) {
      lanesInBand.reverse();
    }
    let alongCursor = marginAlong;
    for (const lane of lanesInBand) {
      laneAlongStart[lane] = alongCursor;
      alongCursor += laneAlong[lane] + opts.ranksep;
    }
  }

  // Handles pointing along the rank axis (the in-band flow direction) …
  const alongPositive = isVertical ? Position.Bottom : Position.Right;
  const alongNegative = isVertical ? Position.Top : Position.Left;
  // … and across it, toward the next/previous band (bands stack toward Bottom for LR, Right for TB).
  const towardNextBand = isVertical ? Position.Right : Position.Bottom;
  const towardPrevBand = isVertical ? Position.Left : Position.Top;

  return nodes.map((node) => {
    const laneIndex = laneIndexByNodeId.get(node.id) ?? 0;
    const band = Math.floor(laneIndex / lanesPerBand);
    const laneInBand = laneIndex - band * lanesPerBand;
    const count = bandLaneCount(band);
    const isReversedBand = band % 2 === 1;

    // A node shorter than its rank is centred in it.
    const alongPosition = laneAlongStart[laneIndex] + (laneAlong[laneIndex] - getAlong(node)) / 2;
    const crossPosition = bandCrossOffset[band] + (node.position[cross] - bandMinCross[band]);
    const x = isVertical ? crossPosition : alongPosition;
    const y = isVertical ? alongPosition : crossPosition;

    // In a reversed band the rank order runs the other way, so flow handles flip with it; the rank
    // at each band edge instead points across to the neighbouring band so its turn edge stays clean.
    const isFirstRankOfBand = laneInBand === 0;
    const isLastRankOfBand = laneInBand === count - 1;
    const flowSource = isReversedBand ? alongNegative : alongPositive;
    const flowTarget = isReversedBand ? alongPositive : alongNegative;
    const targetPosition = isFirstRankOfBand && band > 0 ? towardPrevBand : flowTarget;
    const sourcePosition = isLastRankOfBand && band < bandCount - 1 ? towardNextBand : flowSource;

    return {
      ...node,
      sourcePosition,
      targetPosition,
      position: { x: Math.round(x), y: Math.round(y) },
    };
  });
}

function layoutFlat<T extends Node>(
  nodes: T[],
  edges: Edge[],
  options: LayoutOptions,
  onDagreLayoutFailure?: (error: unknown) => void,
  nodeSizes?: NodeSizes
): T[] {
  const laidOut = applyDagreLayout(nodes, edges, options, onDagreLayoutFailure, nodeSizes);
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  return foldWideLayout(laidOut, edges, opts, nodeSizes);
}

/**
 * Lays out a map that has open groups: nodes with a `parentId` that is also in `nodes`.
 *
 * Each open group's members are laid out on their own, using only the edges between them, and the
 * box is sized to fit that layout. The rest of the map is then laid out with every open group as one
 * node of that size, and the edges of its members attached to it, so the groups around it keep the
 * order they have when the group is closed and nothing overlaps the box.
 */
function layoutWithOpenGroups<T extends Node>(
  nodes: T[],
  edges: Edge[],
  options: LayoutOptions,
  onDagreLayoutFailure?: (error: unknown) => void
): T[] {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  const nodeIds = new Set(nodes.map(({ id }) => id));
  const isMember = (node: T): boolean => !!node.parentId && nodeIds.has(node.parentId);

  const membersByBoxId = new Map<string, T[]>();
  const boxIdByMemberId = new Map<string, string>();
  for (const node of nodes) {
    if (!isMember(node) || !node.parentId) {
      continue;
    }
    boxIdByMemberId.set(node.id, node.parentId);
    membersByBoxId.set(node.parentId, [...(membersByBoxId.get(node.parentId) ?? []), node]);
  }

  const boxSizes = new Map<string, NodeSize>();
  const laidOutMembersById = new Map<string, T>();
  for (const [boxId, members] of membersByBoxId) {
    const memberIds = new Set(members.map(({ id }) => id));
    const memberEdges = edges.filter(
      ({ source, target }) => memberIds.has(source) && memberIds.has(target)
    );
    const laidOutMembers = layoutFlat(members, memberEdges, options, onDagreLayoutFailure);

    const minX = Math.min(...laidOutMembers.map(({ position }) => position.x));
    const minY = Math.min(...laidOutMembers.map(({ position }) => position.y));
    const maxX = Math.max(...laidOutMembers.map(({ position }) => position.x + opts.nodeWidth));
    const maxY = Math.max(...laidOutMembers.map(({ position }) => position.y + opts.nodeHeight));

    boxSizes.set(boxId, {
      width: maxX - minX + 2 * GROUP_BOX_PADDING,
      height: maxY - minY + 2 * GROUP_BOX_PADDING + GROUP_BOX_HEADER_HEIGHT,
    });
    for (const member of laidOutMembers) {
      laidOutMembersById.set(member.id, {
        ...member,
        position: {
          x: member.position.x - minX + GROUP_BOX_PADDING,
          y: member.position.y - minY + GROUP_BOX_PADDING + GROUP_BOX_HEADER_HEIGHT,
        },
      });
    }
  }

  const outerEdges = new Map<string, Edge>();
  for (const edge of edges) {
    const source = boxIdByMemberId.get(edge.source) ?? edge.source;
    const target = boxIdByMemberId.get(edge.target) ?? edge.target;
    if (source !== target) {
      outerEdges.set(`${source}->${target}`, { ...edge, source, target });
    }
  }

  const laidOutOuterNodes = layoutFlat(
    nodes.filter((node) => !isMember(node)),
    Array.from(outerEdges.values()),
    options,
    onDagreLayoutFailure,
    boxSizes
  );
  const laidOutOuterNodesById = new Map(laidOutOuterNodes.map((node) => [node.id, node] as const));

  // Same order as the input, which has every box before its members, as React Flow needs.
  return nodes.map((node) => {
    const laidOutMember = laidOutMembersById.get(node.id);
    if (laidOutMember) {
      return laidOutMember;
    }
    const laidOutNode = laidOutOuterNodesById.get(node.id) ?? node;
    const boxSize = boxSizes.get(node.id);
    return boxSize ? { ...laidOutNode, ...boxSize } : laidOutNode;
  });
}

/**
 * Lays out the service map: runs the standard Dagre hierarchical layout, then folds the result into
 * a compact serpentine of bands when Dagre produces an extremely wide (LR) / tall (TB) layout — for
 * example a long pipeline or deep dependency chain. Layouts that are already reasonably square, too
 * small, or dominated by long-range edges are returned exactly as Dagre laid them out (see
 * {@link foldWideLayout}).
 *
 * Open groups (nodes with a `parentId`) are laid out inside their box, with positions relative to it
 * as React Flow expects for child nodes; see {@link layoutWithOpenGroups}.
 */
export function applyServiceMapLayout<T extends Node>(
  nodes: T[],
  edges: Edge[],
  options: LayoutOptions = {},
  onDagreLayoutFailure?: (error: unknown) => void
): T[] {
  const nodeIds = new Set(nodes.map(({ id }) => id));
  const hasOpenGroups = nodes.some(({ parentId }) => !!parentId && nodeIds.has(parentId));
  return hasOpenGroups
    ? layoutWithOpenGroups(nodes, edges, options, onDagreLayoutFailure)
    : layoutFlat(nodes, edges, options, onDagreLayoutFailure);
}
