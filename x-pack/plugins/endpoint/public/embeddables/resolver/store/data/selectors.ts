/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { DataState, ProcessEvent, IndexedProcessTree } from '../../types';
import { Vector2 } from '../../types';
import { add as vector2Add } from '../../lib/vector2';
import { isGraphableProcess } from '../../models/process_event';
import {
  factory as indexedProcessTreeFactory,
  children as indexedProcessTreeChildren,
  parent as indexedProcessTreeParent,
  isOnlyChild as indexedProcessTreeIsOnlyChild,
  size,
  levelOrder,
} from '../../models/indexed_process_tree';

type ProcessWidths = Map<ProcessEvent, number>;
type ProcessPositions = Map<ProcessEvent, Vector2>;
type EdgeLineSegment = Vector2[];

const unit = 100;
const distanceBetweenNodesInUnits = 1;

/**
 * The distance in pixels (at scale 1) between nodes. Change this to space out nodes more
 */
export const distanceBetweenNodes = distanceBetweenNodesInUnits * unit;

export function graphableProcesses(state: DataState) {
  return state.results.filter(isGraphableProcess);
}

function widthsOfProcessSubtrees(indexedProcessTree: IndexedProcessTree): ProcessWidths {
  const widths = new Map<ProcessEvent, number>();

  if (size(indexedProcessTree) === 0) {
    return widths;
  }

  const processesInReverseLevelOrder = [...levelOrder(indexedProcessTree)].reverse();

  for (const process of processesInReverseLevelOrder) {
    const children = indexedProcessTreeChildren(indexedProcessTree, process);

    const sumOfWidthOfChildren = function sumOfWidthOfChildren() {
      return children.reduce(function sum(currentValue, child) {
        /**
         * `widths.get` will always return a number in this case.
         * This loop sequences a tree in reverse level order. Width values are set for each node.
         * Therefore a parent can always find a width for its children, since all of its children
         * will have been handled already.
         */
        return currentValue + widths.get(child)!;
      }, 0);
    };

    const width = sumOfWidthOfChildren() + Math.max(0, children.length - 1) * distanceBetweenNodes;
    widths.set(process, width);
  }

  return widths;
}

// bet sean loves this
type ProcessWithWidthMetadata = {
  process: ProcessEvent;
  width: number;
} & (
  | ({
      parent: ProcessEvent;
      parentWidth: number;
    } & (
      | { isOnlyChild: true; firstChildWidth: null; lastChildWidth: null }
      | { isOnlyChild: false; firstChildWidth: number; lastChildWidth: number }
    ))
  | {
      parent: null;
      parentWidth: null;
      isOnlyChild: null;
      lastChildWidth: null;
      firstChildWidth: null;
    }
);

function processEdgeLineSegments(
  indexedProcessTree: IndexedProcessTree,
  widths: ProcessWidths,
  positions: ProcessPositions
): EdgeLineSegment[] {
  const edgeLineSegments: EdgeLineSegment[] = [];
  for (const metadata of levelOrderWithWidths(indexedProcessTree, widths)) {
    if (metadata.parent === null) {
      continue;
    }
    const { process, parent, parentWidth } = metadata;
    const position = positions.get(process);
    const parentPosition = positions.get(parent);

    if (position === undefined || parentPosition === undefined) {
      throw new Error();
    }

    const midwayY = parentPosition[1] + (position[1] - parentPosition[1]) / 2;

    const lineFromProcessToMidwayLine: EdgeLineSegment = [
      [
        position[0],
        // Simulate a capped line by moving this up a bit so it overlaps with the midline segment
        midwayY,
      ],
      position,
    ];

    const siblings = indexedProcessTreeChildren(indexedProcessTree, parent);
    const isFirstChild = process === siblings[0];

    // If this is the first child
    if (isFirstChild) {
      // is only child?
      if (metadata.isOnlyChild) {
        // add a single line segment directly from parent to child
        edgeLineSegments.push([parentPosition, position]);
      } else {
        const { firstChildWidth, lastChildWidth } = metadata;
        // Draw 3 line segments
        // One from the parent to the midway line,
        // The midway line (a horizontal line the width of the parent, halfway between the parent and child)
        // A line from the child to the midway line
        //
        const lineFromParentToMidwayLine = [
          // Add a line from parent to midway point
          parentPosition,
          [parentPosition[0], midwayY] as const,
        ];

        const widthOfMidline = parentWidth - firstChildWidth / 2 - lastChildWidth / 2;

        const minX = parentWidth / -2 + firstChildWidth / 2;
        const maxX = minX + widthOfMidline;

        const midwayLine: EdgeLineSegment = [
          [
            // Position line relative to the parent's x component
            parentPosition[0] + minX,
            midwayY,
          ],
          [
            // Position line relative to the parent's x component
            parentPosition[0] + maxX,
            midwayY,
          ],
        ];

        edgeLineSegments.push(
          /* line from parent to midway line */
          lineFromParentToMidwayLine,
          midwayLine,
          lineFromProcessToMidwayLine
        );
      }
    } else {
      // If this isn't the first child, it must have siblings (the first of which drew the midway line and line
      // from the parent to the midway line
      edgeLineSegments.push(lineFromProcessToMidwayLine);
    }
  }
  return edgeLineSegments;
}

function* levelOrderWithWidths(
  tree: IndexedProcessTree,
  widths: ProcessWidths
): Iterable<ProcessWithWidthMetadata> {
  for (const process of levelOrder(tree)) {
    const parent = indexedProcessTreeParent(tree, process);
    const width = widths.get(process);

    if (width === undefined) {
      // TODO explain
      throw new Error();
    }

    if (parent === undefined) {
      yield {
        process,
        width,
        parent: null,
        parentWidth: null,
        isOnlyChild: null,
        firstChildWidth: null,
        lastChildWidth: null,
      };
    } else {
      const parentWidth = widths.get(parent);

      if (parentWidth === undefined) {
        // TODO explain
        throw new Error();
      }

      const thingy: Partial<ProcessWithWidthMetadata> = {
        process,
        width,
        parent,
        parentWidth,
      };

      const siblings = indexedProcessTreeChildren(tree, parent);
      if (siblings.length === 1) {
        thingy.isOnlyChild = true;
        thingy.lastChildWidth = null;
        thingy.firstChildWidth = null;
      } else {
        const firstChildWidth = widths.get(siblings[0]);
        const lastChildWidth = widths.get(siblings[0]);
        if (firstChildWidth === undefined || lastChildWidth === undefined) {
          throw new Error();
        }
        thingy.isOnlyChild = false;
        thingy.firstChildWidth = firstChildWidth;
        thingy.lastChildWidth = lastChildWidth;
      }

      yield thingy as ProcessWithWidthMetadata;
    }
  }
}

function processPositions(
  indexedProcessTree: IndexedProcessTree,
  widths: ProcessWidths
): ProcessPositions {
  const positions = new Map<ProcessEvent, Vector2>();
  // Keep track of last processed parent so we can reset parent specific counters as we iterate
  let lastProcessedParentNode: ProcessEvent | undefined;
  let numberOfPrecedingSiblings = 0;
  let runningWidthOfPrecedingSiblings = 0;

  for (const metadata of levelOrderWithWidths(indexedProcessTree, widths)) {
    // Handle root node
    if (metadata.parent === null) {
      const { process } = metadata;
      positions.set(process, [0, 0]);
    } else {
      const { process, parent, width, parentWidth } = metadata;

      // Reinit counters when parent changes
      if (lastProcessedParentNode !== parent) {
        numberOfPrecedingSiblings = 0;
        runningWidthOfPrecedingSiblings = 0;

        // keep track of this so we know when to reinitialize
        lastProcessedParentNode = parent;
      }

      const parentPosition = positions.get(parent);

      if (parentPosition === undefined) {
        // TODO explain that this can never happen
        throw new Error();
      }

      const xOffset =
        parentWidth / -2 +
        numberOfPrecedingSiblings * distanceBetweenNodes +
        runningWidthOfPrecedingSiblings +
        width / 2;

      const position = vector2Add([xOffset, -distanceBetweenNodes], parentPosition);

      positions.set(process, position);

      numberOfPrecedingSiblings += 1;
      runningWidthOfPrecedingSiblings += width;
    }
  }

  return positions;
}

export const processNodePositionsAndEdgeLineSegments = createSelector(
  graphableProcesses,
  function processNodePositionsAndEdgeLineSegments(
    /* eslint-disable no-shadow */
    graphableProcesses
    /* eslint-enable no-shadow */
  ) {
    const indexedProcessTree = indexedProcessTreeFactory(graphableProcesses);
    const widths = widthsOfProcessSubtrees(indexedProcessTree);

    const positions = processPositions(indexedProcessTree, widths);
    const edgeLineSegments = processEdgeLineSegments(indexedProcessTree, widths, positions);
    /*
    // Keep track of last processed parent so we can reset parent specific counters as we iterate
    let lastProcessedParentNode: ProcessEvent | undefined;
    let numberOfPrecedingSiblings = 0;
    let runningWidthOfPrecedingSiblings = 0;

    // TODO remove guard
    if (graphableProcesses.length !== 0) {
      for (const metadata of levelOrderWithWidths(indexedProcessTree, widths)) {
        // Handle root node
        if (metadata.parent === null) {
          const { process } = metadata;
          positions.set(process, [0, 0]);
        } else {
          const { process, parent, width, parentWidth } = metadata;

          // Reinit counters when parent changes
          if (lastProcessedParentNode !== parent) {
            numberOfPrecedingSiblings = 0;
            runningWidthOfPrecedingSiblings = 0;

            // keep track of this so we know when to reinitialize
            lastProcessedParentNode = parent;
          }

          const parentPosition = positions.get(parent);

          if (parentPosition === undefined) {
            // TODO explain that this can never happen
            throw new Error();
          }

          const xOffset =
            parentWidth / -2 +
            numberOfPrecedingSiblings * distanceBetweenNodes +
            runningWidthOfPrecedingSiblings +
            width / 2;

          const position = vector2Add([xOffset, -distanceBetweenNodes], parentPosition);

          // positions.set(process, position);

          const edgeLineSegmentsForProcess = function edgeLineSegmentsForProcess() {
            const midwayY = parentPosition[1] + (position[1] - parentPosition[1]) / 2;

            // If this is the first child
            if (numberOfPrecedingSiblings === 0) {
              if (indexedProcessTreeIsOnlyChild(indexedProcessTree, process)) {
                // add a single line segment directly from parent to child
                return [[parentPosition, position]];
              } else {
                // Draw 3 line segments
                // One from the parent to the midway line,
                // The midway line (a horizontal line the width of the parent, halfway between the parent and child)
                // A line from the child to the midway line
                return [
                  lineFromParentToMidwayLine(),
                  midwayLine(lastProcessedParentNode),
                  lineFromProcessToMidwayLine(),
                ];
              }
            } else {
              // If this isn't the first child, it must have siblings (the first of which drew the midway line and line
              // from the parent to the midway line
              return [lineFromProcessToMidwayLine()];
            }

            function lineFromParentToMidwayLine() {
              return [
                // Add a line from parent to midway point
                parentPosition,
                [parentPosition[0], midwayY],
              ];
            }

            function lineFromProcessToMidwayLine() {
              return [
                [
                  position[0],
                  // Simulate a capped line by moving this up a bit so it overlaps with the midline segment
                  midwayY,
                ],
                position,
              ];
            }

            function midwayLine(parentProcessNode: ProcessEvent) {
              const parentProcessPosition = positions.get(parentProcessNode);
              const childrenOfParent = indexedProcessTreeChildren(
                indexedProcessTree,
                parentProcessNode
              );
              const lastChild = childrenOfParent[childrenOfParent.length - 1];

              const widthOfParent = widths.get(parentProcessNode);
              const widthOfFirstChild = widths.get(process);
              const widthOfLastChild = widths.get(lastChild);
              const widthOfMidline = widthOfParent - widthOfFirstChild / 2 - widthOfLastChild / 2;

              const minX = widthOfParent / -2 + widthOfFirstChild / 2;
              const maxX = minX + widthOfMidline;

              return [
                [
                  // Position line relative to the parent's x component
                  parentProcessPosition[0] + minX,
                  midwayY,
                ],
                [
                  // Position line relative to the parent's x component
                  parentProcessPosition[0] + maxX,
                  midwayY,
                ],
              ];
            }
          };

          edgeLineSegments.push(...edgeLineSegmentsForProcess());
          numberOfPrecedingSiblings += 1;
          runningWidthOfPrecedingSiblings += width;
        }
      }
    }
    */

    return {
      processNodePositions: positions,
      edgeLineSegments,
    };
  }
);
