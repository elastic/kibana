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

const unit = 100;
const distanceBetweenNodesInUnits = 1;

/**
 * The distance in pixels (at scale 1) between nodes. Change this to space out nodes more
 */
export const distanceBetweenNodes = distanceBetweenNodesInUnits * unit;

export function graphableProcesses(state: DataState) {
  return state.results.filter(isGraphableProcess);
}

function widthsOfProcessSubtrees(indexedProcessTree: IndexedProcessTree) {
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
/**
 * 1. calculate widths
 * 2. calculate positions
 *    we store parent positions as we go
 * 3. calculate edge lines
 *    we store edges as we go
 *
 * for ({ parent, process, parentWidth, lastChildWidth, firstChildWidth,
 */
function* levelOrderWithWidths(
  tree: IndexedProcessTree,
  widths: ReturnType<typeof widthsOfProcessSubtrees>
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

export const processNodePositionsAndEdgeLineSegments = createSelector(
  graphableProcesses,
  function processNodePositionsAndEdgeLineSegments(
    /* eslint-disable no-shadow */
    graphableProcesses
    /* eslint-enable no-shadow */
  ) {
    const indexedProcessTree = indexedProcessTreeFactory(graphableProcesses);
    const widths = widthsOfProcessSubtrees(indexedProcessTree);

    const positions = new Map<ProcessEvent, Vector2>();
    const edgeLineSegments = [];
    let parentProcess: ProcessEvent | undefined;
    let numberOfPrecedingSiblings = 0;
    let runningWidthOfPrecedingSiblings = 0;

    // TODO remove guard
    if (graphableProcesses.length !== 0) {
      for (const { process } of levelOrderWithWidths(indexedProcessTree, widths)) {
        if (parentProcess === undefined) {
          parentProcess = process;
          numberOfPrecedingSiblings = 0;
          runningWidthOfPrecedingSiblings = 0;
          positions.set(process, [0, 0]);
        } else {
          const currentParent = indexedProcessTreeParent(indexedProcessTree, process);
          if (parentProcess !== currentParent) {
            parentProcess = currentParent;
            numberOfPrecedingSiblings = 0;
            runningWidthOfPrecedingSiblings = 0;
          }

          const width = widths.get(process);

          if (!parentProcess) {
            // TODO explain yourself
            throw new Error();
          }

          const parentWidth = widths.get(parentProcess);
          const parentPosition = positions.get(parentProcess);

          if (
            parentProcess === undefined ||
            parentWidth === undefined ||
            width === undefined ||
            parentPosition === undefined
          ) {
            // TODO explain more
            // since we iterate in level order, this can't happened
            throw new Error();
          }

          const xOffset =
            parentWidth / -2 +
            numberOfPrecedingSiblings * distanceBetweenNodes +
            runningWidthOfPrecedingSiblings +
            width / 2;

          const position = vector2Add([xOffset, -distanceBetweenNodes], parentPosition);

          positions.set(process, position);

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
                  midwayLine(parentProcess),
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
              /* eslint-disable no-shadow */
              const parentProcessPosition = positions.get(parentProcessNode);
              /* eslint-enable no-shadow */
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
          runningWidthOfPrecedingSiblings += widths.get(process);
        }
      }
    }

    return {
      processNodePositions: positions,
      edgeLineSegments,
    };
  }
);
