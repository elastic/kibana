/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { DataState, ProcessEvent } from '../../types';
import { levelOrder } from '../../lib/tree_sequencers';
import { Vector2 } from '../../types';
import { add as vector2Add } from '../../lib/vector2';
import { isGraphableProcess } from '../../models/process_event';
import {
  factory as indexedProcessTreeFactory,
  children as indexedProcessTreeChildren,
  parent as indexedProcessTreeParent,
  isOnlyChild as indexedProcessTreeIsOnlyChild,
} from '../../models/indexed_process_tree';

const unit = 100;
const distanceBetweenNodesInUnits = 1;

/**
 * The distance in pixels (at scale 1) between nodes. Change this to space out nodes more
 */
export const distanceBetweenNodes = distanceBetweenNodesInUnits * unit;

function yHalfWayBetweenSourceAndTarget(sourcePosition: Vector2, targetPosition: Vector2) {
  return sourcePosition[1] + (targetPosition[1] - sourcePosition[1]) / 2;
}

export function graphableProcesses(state: DataState) {
  return state.results.filter(isGraphableProcess);
}

const indexedProcessTree = createSelector(graphableProcesses, indexedProcessTreeFactory);

const widthOfProcessSubtrees = createSelector(
  graphableProcesses,
  indexedProcessTree,
  function widthOfProcessSubtrees(
    /* eslint-disable no-shadow */
    graphableProcesses,
    indexedProcessTree
    /* eslint-enable no-shadow */
  ) {
    const widths = new Map<ProcessEvent, number>();

    if (graphableProcesses.length === 0) {
      return widths;
    }

    const processesInReverseLevelOrder = [
      ...levelOrder(graphableProcesses[0], (child: ProcessEvent) =>
        indexedProcessTreeChildren(indexedProcessTree, child)
      ),
    ].reverse();

    for (const process of processesInReverseLevelOrder) {
      const children = indexedProcessTreeChildren(indexedProcessTree, process);

      const sumOfWidthOfChildren = function sumOfWidthOfChildren() {
        return children.reduce(function sum(currentValue, child) {
          /**
           * widths.get will always be defined because we are populating it in reverse level order.
           */
          return currentValue + widths.get(child)!;
        }, 0);
      };

      const width =
        sumOfWidthOfChildren() + Math.max(0, children.length - 1) * distanceBetweenNodes;
      widths.set(process, width);
    }

    return widths;
  }
);

export const processNodePositionsAndEdgeLineSegments = createSelector(
  graphableProcesses,
  indexedProcessTree,
  widthOfProcessSubtrees,
  function processNodePositionsAndEdgeLineSegments(
    /* eslint-disable no-shadow */
    graphableProcesses,
    indexedProcessTree,
    widthOfProcessSubtrees
    /* eslint-enable no-shadow */
  ) {
    const positions = new Map<ProcessEvent, Vector2>();
    const edgeLineSegments = [];
    let parentProcess: ProcessEvent | undefined;
    let numberOfPrecedingSiblings = 0;
    let runningWidthOfPrecedingSiblings = 0;

    if (graphableProcesses.length !== 0) {
      for (const process of levelOrder(graphableProcesses[0], (child: ProcessEvent) =>
        indexedProcessTreeChildren(indexedProcessTree, child)
      )) {
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

          const xOffset =
            widthOfProcessSubtrees.get(parentProcess) / -2 +
            numberOfPrecedingSiblings * distanceBetweenNodes +
            runningWidthOfPrecedingSiblings +
            widthOfProcessSubtrees.get(process) / 2;

          const position = vector2Add(
            [xOffset, -distanceBetweenNodes],
            positions.get(parentProcess)
          );

          positions.set(process, position);

          const edgeLineSegmentsForProcess = function edgeLineSegmentsForProcess() {
            const parentProcessPosition = positions.get(parentProcess);
            const midwayY = yHalfWayBetweenSourceAndTarget(parentProcessPosition, position);

            // If this is the first child
            if (numberOfPrecedingSiblings === 0) {
              if (indexedProcessTreeIsOnlyChild(indexedProcessTree, process)) {
                // add a single line segment directly from parent to child
                return [[parentProcessPosition, position]];
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
                parentProcessPosition,
                [parentProcessPosition[0], midwayY],
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

              const widthOfParent = widthOfProcessSubtrees.get(parentProcessNode);
              const widthOfFirstChild = widthOfProcessSubtrees.get(process);
              const widthOfLastChild = widthOfProcessSubtrees.get(lastChild);
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
          runningWidthOfPrecedingSiblings += widthOfProcessSubtrees.get(process);
        }
      }
    }

    return {
      processNodePositions: positions,
      edgeLineSegments,
    };
  }
);
