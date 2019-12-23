/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { ResolverState } from '../../types';
import { sampleData } from './sample';
import { depthFirstPreorder, levelOrder } from '../../lib/tree_sequencers';
import { Vector2 } from '../../types';
import { add as vector2Add } from '../../lib/vector2';

const unit = 100;
const distanceBetweenNodesInUnits = 1;
const distanceBetweenNodes = distanceBetweenNodesInUnits * unit;

function dataSelector(state: ResolverState) {
  return sampleData.data.result.search_results;
}

export function isGraphableProcess(event) {
  return eventType(event) === 'processCreated' || eventType(event) === 'processRan';
}

export function eventType(event) {
  const {
    data_buffer: { event_type_full: type, event_subtype_full: subType },
  } = event;

  if (type === 'process_event') {
    if (subType === 'creation_event' || subType === 'fork_event' || subType === 'exec_event') {
      return 'processCreated';
    } else if (subType === 'already_running') {
      return 'processRan';
    } else if (subType === 'termination_event') {
      return 'processTerminated';
    } else {
      return 'unknownProcessEvent';
    }
  } else if (type === 'alert_event') {
    return 'processCausedAlert';
  }
  return 'unknownEvent';
}

function uniquePidForProcess(event) {
  return event.data_buffer.node_id;
}

function uniqueParentPidForProcess(event) {
  return event.data_buffer.source_id;
}

function yHalfWayBetweenSourceAndTarget(sourcePosition: Vector2, targetPosition: Vector2) {
  return sourcePosition[1] + (targetPosition[1] - sourcePosition[1]) / 2;
}

function childrenOfProcessFromGraphableProcessesPidMaps(graphableProcessesPidMaps, parentProcess) {
  const uniqueParentPid = uniquePidForProcess(parentProcess);
  const children = graphableProcessesPidMaps.processesByUniqueParentPid.get(uniqueParentPid);
  return children === undefined ? [] : children;
}

function parentOfProcessFromGraphableProcessesPidMaps(graphableProcessesPidMaps, childProcess) {
  const uniqueParentPid = uniqueParentPidForProcess(childProcess);
  return graphableProcessesPidMaps.processesByUniquePid.get(uniqueParentPid);
}

function isProcessOnlyChildFromGraphableProcessPidMaps(graphableProcessesPidMaps, childProcess) {
  const parentProcess = parentOfProcessFromGraphableProcessesPidMaps(
    graphableProcessesPidMaps,
    childProcess
  );
  return (
    childrenOfProcessFromGraphableProcessesPidMaps(graphableProcessesPidMaps, parentProcess)
      .length === 1
  );
}

export function graphableProcesses(state: ResolverState) {
  return dataSelector(state).filter(isGraphableProcess);
}

const graphableProcessesPidMaps = createSelector(
  graphableProcesses,
  function graphableProcessesPidMaps(
    /* eslint-disable no-shadow */
    graphableProcesses
    /* eslint-disable no-shadow */
  ) {
    const processesByUniqueParentPid = new Map();
    const processesByUniquePid = new Map();

    for (const process of graphableProcesses) {
      processesByUniquePid.set(uniquePidForProcess(process), process);
      const uniqueParentPid = uniqueParentPidForProcess(process);
      if (processesByUniqueParentPid.has(uniqueParentPid)) {
        processesByUniqueParentPid.get(uniqueParentPid).push(process);
      } else {
        processesByUniqueParentPid.set(uniqueParentPid, [process]);
      }
    }

    return {
      processesByUniqueParentPid,
      processesByUniquePid,
    };
  }
);
const widthOfProcessSubtrees = createSelector(
  graphableProcesses,
  graphableProcessesPidMaps,
  function widthOfProcessSubtrees(
    /* eslint-disable no-shadow */
    graphableProcesses,
    graphableProcessesPidMaps
    /* eslint-enable no-shadow */
  ) {
    const processesInReverseLevelOrder = [
      ...levelOrder({
        root: graphableProcesses[0],
        children: childrenOfProcess,
      }),
    ].reverse();

    const widths = new Map();

    for (const process of processesInReverseLevelOrder) {
      const children = childrenOfProcess(process);

      const sumOfWidthOfChildren = function sumOfWidthOfChildren() {
        return children.reduce(function sum(currentValue, child) {
          return currentValue + widths.get(child);
        }, 0);
      };

      const width =
        sumOfWidthOfChildren() + Math.max(0, children.length - 1) * distanceBetweenNodes;
      widths.set(process, width);
    }

    return widths;

    function childrenOfProcess(parentProcess) {
      return childrenOfProcessFromGraphableProcessesPidMaps(
        graphableProcessesPidMaps,
        parentProcess
      );
    }
  }
);

export const processNodePositionsAndEdgeLineSegments = createSelector(
  graphableProcesses,
  graphableProcessesPidMaps,
  widthOfProcessSubtrees,
  function processNodePositionsAndEdgeLineSegments(
    /* eslint-disable no-shadow */
    graphableProcesses,
    graphableProcessesPidMaps,
    widthOfProcessSubtrees
    /* eslint-enable no-shadow */
  ) {
    const positions = new Map();
    const edgeLineSegments = [];
    let parentProcess = null;
    let numberOfPrecedingSiblings = null;
    let runningWidthOfPrecedingSiblings = null;
    for (const process of levelOrder({
      root: graphableProcesses[0],
      children: childrenOfProcess,
    })) {
      if (parentProcess === null) {
        parentProcess = process;
        numberOfPrecedingSiblings = 0;
        runningWidthOfPrecedingSiblings = 0;
        // const yOffset = originHasChildren
        // ? distanceBetweenNodes * (lineageEvents.length + 0.5)
        // : distanceBetweenNodes * lineageEvents.length

        const yOffset = distanceBetweenNodes * 1;
        positions.set(process, [0, yOffset]);
      } else {
        if (parentProcess !== parentOfProcess(process)) {
          parentProcess = parentOfProcess(process);
          numberOfPrecedingSiblings = 0;
          runningWidthOfPrecedingSiblings = 0;
        }

        const xOffset =
          widthOfProcessSubtrees.get(parentProcess) / -2 +
          numberOfPrecedingSiblings * distanceBetweenNodes +
          runningWidthOfPrecedingSiblings +
          widthOfProcessSubtrees.get(process) / 2;

        const position = vector2Add([xOffset, -distanceBetweenNodes], positions.get(parentProcess));

        positions.set(process, position);

        const edgeLineSegmentsForProcess = function edgeLineSegmentsForProcess() {
          const parentProcessPosition = positions.get(parentProcess);
          const midwayY = yHalfWayBetweenSourceAndTarget(parentProcessPosition, position);

          // If this is the first child
          if (numberOfPrecedingSiblings === 0) {
            if (isProcessOnlyChild(process)) {
              // add a single line segment directly from parent to child
              return [[parentProcessPosition, position]];
            } else {
              // Draw 3 line segments
              // One from the parent to the midway line,
              // The midway line (a horizontal line the width of the parent, halfway between the parent and child)
              // A line from the child to the midway line
              return [lineFromParentToMidwayLine(), midwayLine(), lineFromProcessToMidwayLine()];
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

          function midwayLine() {
            /* eslint-disable no-shadow */
            const parentProcessPosition = positions.get(parentProcess);
            /* eslint-enable no-shadow */
            const childrenOfParent = childrenOfProcess(parentProcess);
            const lastChild = childrenOfParent[childrenOfParent.length - 1];

            const widthOfParent = widthOfProcessSubtrees.get(parentProcess);
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

    function childrenOfProcess(
      /* eslint-disable no-shadow */
      parentProcess
      /* eslint-enable no-shadow */
    ) {
      return childrenOfProcessFromGraphableProcessesPidMaps(
        graphableProcessesPidMaps,
        parentProcess
      );
    }

    function parentOfProcess(childProcess) {
      return parentOfProcessFromGraphableProcessesPidMaps(graphableProcessesPidMaps, childProcess);
    }

    function isProcessOnlyChild(childProcess) {
      return isProcessOnlyChildFromGraphableProcessPidMaps(graphableProcessesPidMaps, childProcess);
    }

    return {
      processNodePositions: positions,
      edgeLineSegments,
    };
  }
);
