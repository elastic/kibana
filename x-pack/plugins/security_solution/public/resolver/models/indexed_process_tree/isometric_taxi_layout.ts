/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as vector2 from '../../models/vector2';
import {
  IndexedProcessTree,
  Vector2,
  EdgeLineSegment,
  ProcessWidths,
  ProcessPositions,
  EdgeLineMetadata,
  ProcessWithWidthMetadata,
  Matrix3,
  IsometricTaxiLayout,
} from '../../types';
import * as event from '../../../../common/endpoint/models/event';
import { ResolverEvent } from '../../../../common/endpoint/types';
import * as model from './index';
import { getFriendlyElapsedTime as elapsedTime } from '../../lib/date';

/**
 * Graph the process tree
 */
export function isometricTaxiLayout(indexedProcessTree: IndexedProcessTree): IsometricTaxiLayout {
  /**
   * Walk the tree in reverse level order, calculating the 'width' of subtrees.
   */
  const widths = widthsOfProcessSubtrees(indexedProcessTree);

  /**
   * Walk the tree in level order. Using the precalculated widths, calculate the position of nodes.
   * Nodes are positioned relative to their parents and preceding siblings.
   */
  const positions = processPositions(indexedProcessTree, widths);

  /**
   * With the widths and positions precalculated, we calculate edge line segments (arrays of vector2s)
   * which connect them in a 'pitchfork' design.
   */
  const edgeLineSegments = processEdgeLineSegments(indexedProcessTree, widths, positions);

  /**
   * Transform the positions of nodes and edges so they seem like they are on an isometric grid.
   */
  const transformedEdgeLineSegments: EdgeLineSegment[] = [];
  const transformedPositions = new Map<ResolverEvent, Vector2>();

  for (const [processEvent, position] of positions) {
    transformedPositions.set(
      processEvent,
      vector2.applyMatrix3(position, isometricTransformMatrix)
    );
  }

  for (const edgeLineSegment of edgeLineSegments) {
    const {
      points: [startPoint, endPoint],
    } = edgeLineSegment;

    const transformedSegment: EdgeLineSegment = {
      ...edgeLineSegment,
      points: [
        vector2.applyMatrix3(startPoint, isometricTransformMatrix),
        vector2.applyMatrix3(endPoint, isometricTransformMatrix),
      ],
    };

    transformedEdgeLineSegments.push(transformedSegment);
  }

  return {
    processNodePositions: transformedPositions,
    edgeLineSegments: transformedEdgeLineSegments,
  };
}

/**
 * In laying out the graph, we precalculate the 'width' of each subtree. The 'width' of the subtree is determined by its
 * descedants and the rule that each process node must be at least 1 unit apart. Enforcing that all nodes are at least
 * 1 unit apart on the x axis makes it easy to prevent the UI components from overlapping. There will always be space.
 *
 * Example widths:
 *
 *    A and B each have a width of 0
 *
 *          A
 *          |
 *          B
 *
 *    A has a width of 1. B and C have a width of 0.
 *    B and C must be 1 unit apart, so the A subtree has a width of 1.
 *
 *          A
 *      ____|____
 *     |         |
 *     B         C
 *
 *
 *    D, E, F, G, H all have a width of 0.
 *    B has a width of 1 since D->E must be 1 unit apart.
 *    Similarly, C has a width of 1 since F->G must be 1 unit apart.
 *    A has width of 3, since B has a width of 1, and C has a width of 1, and E->F must be at least
 *    1 unit apart.
 *          A
 *      ____|____
 *     |         |
 *     B         C
 *  ___|___   ___|___
 * |       | |       |
 * D       E F       G
 *                   |
 *                   H
 *
 */
function widthsOfProcessSubtrees(indexedProcessTree: IndexedProcessTree): ProcessWidths {
  const widths = new Map<ResolverEvent, number>();

  if (model.size(indexedProcessTree) === 0) {
    return widths;
  }

  const processesInReverseLevelOrder = [...model.levelOrder(indexedProcessTree)].reverse();

  for (const process of processesInReverseLevelOrder) {
    const children = model.children(indexedProcessTree, process);

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

function processEdgeLineSegments(
  indexedProcessTree: IndexedProcessTree,
  widths: ProcessWidths,
  positions: ProcessPositions
): EdgeLineSegment[] {
  const edgeLineSegments: EdgeLineSegment[] = [];
  for (const metadata of levelOrderWithWidths(indexedProcessTree, widths)) {
    const edgeLineMetadata: EdgeLineMetadata = { uniqueId: '' };
    /**
     * We only handle children, drawing lines back to their parents. The root has no parent, so we skip it
     */
    if (metadata.parent === null) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const { process, parent, parentWidth } = metadata;
    const position = positions.get(process);
    const parentPosition = positions.get(parent);
    const parentId = event.entityId(parent);
    const processEntityId = event.entityId(process);
    const edgeLineId = parentId ? parentId + processEntityId : parentId;

    if (position === undefined || parentPosition === undefined) {
      /**
       * All positions have been precalculated, so if any are missing, it's an error. This will never happen.
       */
      throw new Error();
    }

    const parentTime = event.eventTimestamp(parent);
    const processTime = event.eventTimestamp(process);
    if (parentTime && processTime) {
      edgeLineMetadata.elapsedTime = elapsedTime(parentTime, processTime) ?? undefined;
    }
    edgeLineMetadata.uniqueId = edgeLineId;

    /**
     * The point halfway between the parent and child on the y axis, we sometimes have a hard angle here in the edge line
     */
    const midwayY = parentPosition[1] + (position[1] - parentPosition[1]) / 2;

    /**
     * When drawing edge lines between a parent and children (when there are multiple children) we draw a pitchfork type
     * design. The 'midway' line, runs along the x axis and joins all the children with a single descendant line from the parent.
     * See the ascii diagram below. The underscore characters would be the midway line.
     *
     *          A
     *      ____|____
     *     |         |
     *     B         C
     */
    const lineFromProcessToMidwayLine: EdgeLineSegment = {
      points: [[position[0], midwayY], position],
      metadata: edgeLineMetadata,
    };

    const siblings = model.children(indexedProcessTree, parent);
    const isFirstChild = process === siblings[0];

    if (metadata.isOnlyChild) {
      // add a single line segment directly from parent to child. We don't do the 'pitchfork' in this case.
      edgeLineSegments.push({ points: [parentPosition, position], metadata: edgeLineMetadata });
    } else if (isFirstChild) {
      /**
       * If the parent has multiple children, we draw the 'midway' line, and the line from the
       * parent to the midway line, while handling the first child.
       *
       * Consider A the parent, and B the first child. We would draw somemthing like what's in the below diagram. The line from the
       * midway line to C would be drawn when we handle C.
       *
       *          A
       *      ____|____
       *     |
       *     B         C
       */
      const { firstChildWidth, lastChildWidth } = metadata;

      const lineFromParentToMidwayLine: EdgeLineSegment = {
        points: [parentPosition, [parentPosition[0], midwayY]],
        metadata: { uniqueId: `parentToMid${edgeLineId}` },
      };

      const widthOfMidline = parentWidth - firstChildWidth / 2 - lastChildWidth / 2;

      const minX = parentWidth / -2 + firstChildWidth / 2;
      const maxX = minX + widthOfMidline;

      const midwayLine: EdgeLineSegment = {
        points: [
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
        ],
        metadata: { uniqueId: `midway${edgeLineId}` },
      };

      edgeLineSegments.push(
        /* line from parent to midway line */
        lineFromParentToMidwayLine,
        midwayLine,
        lineFromProcessToMidwayLine
      );
    } else {
      // If this isn't the first child, it must have siblings (the first of which drew the midway line and line
      // from the parent to the midway line
      edgeLineSegments.push(lineFromProcessToMidwayLine);
    }
  }
  return edgeLineSegments;
}

function processPositions(
  indexedProcessTree: IndexedProcessTree,
  widths: ProcessWidths
): ProcessPositions {
  const positions = new Map<ResolverEvent, Vector2>();
  /**
   * This algorithm iterates the tree in level order. It keeps counters that are reset for each parent.
   * By keeping track of the last parent node, we can know when we are dealing with a new set of siblings and
   * reset the counters.
   */
  let lastProcessedParentNode: ResolverEvent | undefined;
  /**
   * Nodes are positioned relative to their siblings. We walk this in level order, so we handle
   * children left -> right.
   *
   * The width of preceding siblings is used to left align the node.
   * The number of preceding siblings is important because each sibling must be 1 unit apart
   * on the x axis.
   */
  let numberOfPrecedingSiblings = 0;
  let runningWidthOfPrecedingSiblings = 0;

  for (const metadata of levelOrderWithWidths(indexedProcessTree, widths)) {
    // Handle root node
    if (metadata.parent === null) {
      const { process } = metadata;
      /**
       * Place the root node at (0, 0) for now.
       */
      positions.set(process, [0, 0]);
    } else {
      const { process, parent, isOnlyChild, width, parentWidth } = metadata;

      // Reinit counters when parent changes
      if (lastProcessedParentNode !== parent) {
        numberOfPrecedingSiblings = 0;
        runningWidthOfPrecedingSiblings = 0;

        // keep track of this so we know when to reinitialize
        lastProcessedParentNode = parent;
      }

      const parentPosition = positions.get(parent);

      if (parentPosition === undefined) {
        /**
         * Since this algorithm populates the `positions` map in level order,
         * the parent node will have been processed already and the parent position
         * will always be available.
         *
         * This will never happen.
         */
        throw new Error();
      }

      /**
       * The x 'offset' is added to the x value of the parent to determine the position of the node.
       * We add `parentWidth / -2` in order to align the left side of this node with the left side of its parent.
       * We add `numberOfPrecedingSiblings * distanceBetweenNodes` in order to keep each node 1 apart on the x axis.
       * We add `runningWidthOfPrecedingSiblings` so that we don't overlap with our preceding siblings. We stack em up.
       * We add `width / 2` so that we center the node horizontally (in case it has non-0 width.)
       */
      const xOffset =
        parentWidth / -2 +
        numberOfPrecedingSiblings * distanceBetweenNodes +
        runningWidthOfPrecedingSiblings +
        width / 2;

      /**
       * The y axis gains `-distanceBetweenNodes` as we move down the screen 1 unit at a time.
       */
      let yDistanceBetweenNodes = -distanceBetweenNodes;

      if (!isOnlyChild) {
        // Make space on leaves to show elapsed time
        yDistanceBetweenNodes *= 2;
      }

      const position = vector2.add([xOffset, yDistanceBetweenNodes], parentPosition);

      positions.set(process, position);

      numberOfPrecedingSiblings += 1;
      runningWidthOfPrecedingSiblings += width;
    }
  }

  return positions;
}
function* levelOrderWithWidths(
  tree: IndexedProcessTree,
  widths: ProcessWidths
): Iterable<ProcessWithWidthMetadata> {
  for (const process of model.levelOrder(tree)) {
    const parent = model.parent(tree, process);
    const width = widths.get(process);

    if (width === undefined) {
      /**
       * All widths have been precalcluated, so this will not happen.
       */
      throw new Error();
    }

    /** If the parent is undefined, we are processing the root. */
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
        /**
         * All widths have been precalcluated, so this will not happen.
         */
        throw new Error();
      }

      const metadata: Partial<ProcessWithWidthMetadata> = {
        process,
        width,
        parent,
        parentWidth,
      };

      const siblings = model.children(tree, parent);
      if (siblings.length === 1) {
        metadata.isOnlyChild = true;
        metadata.lastChildWidth = width;
        metadata.firstChildWidth = width;
      } else {
        const firstChildWidth = widths.get(siblings[0]);
        const lastChildWidth = widths.get(siblings[siblings.length - 1]);
        if (firstChildWidth === undefined || lastChildWidth === undefined) {
          /**
           * All widths have been precalcluated, so this will not happen.
           */
          throw new Error();
        }
        metadata.isOnlyChild = false;
        metadata.firstChildWidth = firstChildWidth;
        metadata.lastChildWidth = lastChildWidth;
      }

      yield metadata as ProcessWithWidthMetadata;
    }
  }
}

/**
 * An isometric projection is a method for representing three dimensional objects in 2 dimensions.
 * More information about isometric projections can be found here https://en.wikipedia.org/wiki/Isometric_projection.
 * In our case, we obtain the isometric projection by rotating the objects 45 degrees in the plane of the screen
 * and arctan(1/sqrt(2)) (~35.3 degrees) through the horizontal axis.
 *
 * A rotation by 45 degrees in the plane of the screen is given by:
 * [ sqrt(2)/2   -sqrt(2)/2   0
 *   sqrt(2)/2    sqrt(2)/2   0
 *   0            0           1]
 *
 * A rotation by arctan(1/sqrt(2)) through the horizantal axis is given by:
 * [ 1      0          0
 *   0      sqrt(3)/3  -sqrt(6)/3
 *   0      sqrt(6)/3  sqrt(3)/3]
 *
 * We can multiply both of these matrices to get the final transformation below.
 */
/* prettier-ignore */
const isometricTransformMatrix: Matrix3 = [
  Math.sqrt(2) / 2,   -(Math.sqrt(2) / 2),  0,
  Math.sqrt(6) / 6,   Math.sqrt(6) / 6,     -(Math.sqrt(6) / 3),
  0,                  0,                    1,
]

const unit = 140;
const distanceBetweenNodesInUnits = 2;

/**
 * The distance in pixels (at scale 1) between nodes. Change this to space out nodes more
 */
const distanceBetweenNodes = distanceBetweenNodesInUnits * unit;
