/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Dagre from '@dagrejs/dagre';
import { Position, type Edge, type Node } from '@xyflow/react';

export interface GroupLayoutOptions {
  nodeWidth: number;
  /** Visual height of a leaf (icon + label + badges) — dagre packs from this. */
  nodeHeight: number;
  ranksep: number;
  nodesep: number;
}

/** Space around members and above them for the group title — tight so boxes hug their contents. */
const GROUP_PADDING = 24;
const GROUP_HEADER = 36;
const MARGIN = 16;

type GroupedNode = Node<{ parentId?: string } & Record<string, unknown>>;

type AbsoluteBox = { x: number; y: number; width: number; height: number };

interface InnerBox {
  width: number;
  height: number;
  /** Position of each direct child inside this box, before padding / header. */
  children: Map<string, { x: number; y: number }>;
}

/**
 * Nested layout the way Mermaid / architecture diagrams do it:
 * - each group is laid out on its own, then treated as a block by the level above;
 * - members linked by edges stay in an LR layered row (one baseline);
 * - members with no sibling edges (e.g. a GitHub sources box) are packed in a tight stack
 *   under the connected row — never left as a free floater that blows out the parent.
 */
export const applyGroupedLayout = <T extends GroupedNode>(
  nodes: T[],
  edges: Edge[],
  { nodeWidth, nodeHeight, ranksep, nodesep }: GroupLayoutOptions
): T[] => {
  const ids = new Set(nodes.map(({ id }) => id));
  const parentOf = new Map<string, string>();
  nodes.forEach(({ id, data }) => {
    const parent = data.parentId;
    if (parent && parent !== id && ids.has(parent)) parentOf.set(id, parent);
  });
  // A cycle has no top; cut it where it closes.
  const safeParentOf = new Map<string, string>();
  parentOf.forEach((parent, id) => {
    const seen = new Set([id]);
    for (let up: string | undefined = parent; up; up = parentOf.get(up)) {
      if (seen.has(up)) return;
      seen.add(up);
    }
    safeParentOf.set(id, parent);
  });

  const childrenOf = new Map<string | undefined, string[]>();
  nodes.forEach(({ id }) => {
    const parent = safeParentOf.get(id);
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), id]);
  });

  /** The ancestor of `id` (or itself) that is a direct child of `container`. */
  const childOf = (id: string, container: string | undefined): string | undefined => {
    for (let at: string | undefined = id; at; at = safeParentOf.get(at)) {
      if (safeParentOf.get(at) === container) return at;
    }
    return undefined;
  };

  const boxes = new Map<string, InnerBox>();
  const sizeOf = (id: string): { width: number; height: number } => {
    const box = boxes.get(id);
    return box
      ? {
          width: box.width + GROUP_PADDING * 2,
          height: box.height + GROUP_PADDING + GROUP_HEADER,
        }
      : { width: nodeWidth, height: nodeHeight };
  };

  const packVertical = (
    memberIds: string[],
    originX: number,
    originY: number
  ): { positions: Map<string, { x: number; y: number }>; width: number; height: number } => {
    const positions = new Map<string, { x: number; y: number }>();
    let y = originY;
    let width = originX;
    memberIds.forEach((id) => {
      const size = sizeOf(id);
      positions.set(id, { x: originX, y });
      y += size.height + nodesep;
      width = Math.max(width, originX + size.width);
    });
    return {
      positions,
      width: width + MARGIN,
      height: memberIds.length === 0 ? originY : y - nodesep + MARGIN,
    };
  };

  const layOut = (container: string | undefined): InnerBox => {
    const members = childrenOf.get(container) ?? [];
    members.forEach((id) => {
      if (childrenOf.has(id)) boxes.set(id, layOut(id));
    });

    const siblingLinks: Array<[string, string]> = [];
    edges.forEach(({ source, target }) => {
      const from = childOf(source, container);
      const to = childOf(target, container);
      if (from && to && from !== to) siblingLinks.push([from, to]);
    });
    const linked = new Set<string>();
    siblingLinks.forEach(([from, to]) => {
      linked.add(from);
      linked.add(to);
    });
    const connected = members.filter((id) => linked.has(id));
    const isolated = members.filter((id) => !linked.has(id));

    const positions = new Map<string, { x: number; y: number }>();
    let width = MARGIN;
    let height = MARGIN;

    if (connected.length > 0) {
      const graph = new Dagre.graphlib.Graph({ directed: true, compound: false })
        .setGraph({ rankdir: 'LR', ranksep, nodesep, marginx: MARGIN, marginy: MARGIN })
        .setDefaultEdgeLabel(() => ({}));
      connected.forEach((id) => graph.setNode(id, sizeOf(id)));
      siblingLinks.forEach(([from, to]) => {
        if (linked.has(from) && linked.has(to)) graph.setEdge(from, to);
      });
      Dagre.layout(graph);

      connected.forEach((id) => {
        const placed = graph.node(id);
        const size = sizeOf(id);
        positions.set(id, {
          x: placed.x - size.width / 2,
          y: placed.y - size.height / 2,
        });
      });

      // Architecture diagrams align tops of groups on an LR chain. Skip when two groups share a
      // rank (overlapping X) — forcing one Y would stack them on top of each other.
      const groupIds = connected.filter((id) => boxes.has(id));
      if (groupIds.length > 1) {
        const sorted = [...groupIds].sort(
          (a, b) => positions.get(a)!.x - positions.get(b)!.x
        );
        const chain = sorted.every((id, index) => {
          if (index === 0) return true;
          const prev = sorted[index - 1];
          return positions.get(id)!.x >= positions.get(prev)!.x + sizeOf(prev).width - 1;
        });
        if (chain) {
          const top = Math.min(...groupIds.map((id) => positions.get(id)!.y));
          groupIds.forEach((id) => {
            const at = positions.get(id)!;
            positions.set(id, { x: at.x, y: top });
          });
        }
      }

      connected.forEach((id) => {
        const at = positions.get(id)!;
        const size = sizeOf(id);
        width = Math.max(width, at.x + size.width + MARGIN);
        height = Math.max(height, at.y + size.height + MARGIN);
      });
    }

    if (isolated.length > 0) {
      // No fake edges into the layered pass — pack context (repos, unused allocators) under the
      // flow so the parent box stays tight (Mermaid isolated-cluster packing).
      const stackOriginY = connected.length > 0 ? height + nodesep : MARGIN;
      const packed = packVertical(isolated, MARGIN, stackOriginY);
      packed.positions.forEach((at, id) => positions.set(id, at));
      width = Math.max(width, packed.width);
      height = Math.max(height, packed.height);
    }

    if (connected.length === 0 && isolated.length === 0) {
      return { width: MARGIN * 2, height: MARGIN * 2, children: positions };
    }

    return { width, height, children: positions };
  };

  const root = layOut(undefined);

  const absolute = new Map<string, AbsoluteBox>();
  const place = (container: string | undefined, box: InnerBox, originX: number, originY: number) => {
    box.children.forEach((at, id) => {
      const x = originX + at.x;
      const y = originY + at.y;
      const inner = boxes.get(id);
      if (inner) {
        const size = sizeOf(id);
        absolute.set(id, { x, y, width: size.width, height: size.height });
        place(id, inner, x + GROUP_PADDING, y + GROUP_HEADER);
      } else {
        absolute.set(id, { x, y, width: nodeWidth, height: nodeHeight });
      }
    });
  };
  place(undefined, root, 0, 0);

  // Absolute canvas coords for every node — no React Flow parentId nesting. Edges into a
  // group member used relative handles under parentId and drew a U-turn / jump on hover.
  return nodes.map((node) => {
    const abs = absolute.get(node.id);
    const isGroup = boxes.has(node.id);

    if (!abs) {
      return {
        ...node,
        parentId: undefined,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    }

    const position = { x: Math.round(abs.x), y: Math.round(abs.y) };

    if (isGroup) {
      return {
        ...node,
        position,
        parentId: undefined,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        zIndex: 0,
        draggable: false,
        selectable: false,
        width: abs.width,
        height: abs.height,
        measured: { width: abs.width, height: abs.height },
        style: { ...node.style, width: abs.width, height: abs.height },
      };
    }

    return {
      ...node,
      position,
      parentId: undefined,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      zIndex: 1,
    };
  });
};

/** Whether any node sits inside another. */
export const hasGroups = (nodes: GroupedNode[]): boolean => {
  const ids = new Set(nodes.map(({ id }) => id));
  return nodes.some(
    ({ id, data }) => data.parentId && data.parentId !== id && ids.has(data.parentId)
  );
};
