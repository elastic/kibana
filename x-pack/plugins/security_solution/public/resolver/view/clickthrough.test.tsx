/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from '../data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { urlSearch } from '../test_utilities/url_search';
import { Vector2, AABB } from '../types';

let simulator: Simulator;
let databaseDocumentID: string;
let entityIDs: { origin: string; firstChild: string; secondChild: string };

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe('Resolver, when analyzing a tree that has no ancestors and 2 children', () => {
  beforeEach(async () => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = noAncestorsTwoChildren();

    // save a reference to the entity IDs exposed by the mock data layer
    entityIDs = dataAccessLayerMetadata.entityIDs;

    // save a reference to the `_id` supported by the mock data layer
    databaseDocumentID = dataAccessLayerMetadata.databaseDocumentID;

    // create a resolver simulator, using the data access layer and an arbitrary component instance ID
    simulator = new Simulator({ databaseDocumentID, dataAccessLayer, resolverComponentInstanceID });
  });

  describe('when it has loaded', () => {
    beforeEach(async () => {
      await expect(
        /**
         * It's important that all of these are done in a single `expect`.
         * If you do them concurrently with each other, you'll have incorrect results.
         *
         * For example, there might be no loading element at one point, and 1 graph element at one point, but never a single time when there is both 1 graph element and 0 loading elements.
         */
        simulator.map(() => ({
          graphElements: simulator.testSubject('resolver:graph').length,
          graphLoadingElements: simulator.testSubject('resolver:graph:loading').length,
          graphErrorElements: simulator.testSubject('resolver:graph:error').length,
        }))
      ).toYieldEqualTo({
        // it should have 1 graph element, an no error or loading elements.
        graphElements: 1,
        graphLoadingElements: 0,
        graphErrorElements: 0,
      });
    });

    // Combining assertions here for performance. Unfortunately, Enzyme + jsdom + React is slow.
    it(`should have 3 nodes, with the entityID's 'origin', 'firstChild', and 'secondChild'. 'origin' should be selected.`, async () => {
      await expect(
        simulator.map(() => ({
          selectedOriginCount: simulator.selectedProcessNode(entityIDs.origin).length,
          unselectedFirstChildCount: simulator.unselectedProcessNode(entityIDs.firstChild).length,
          unselectedSecondChildCount: simulator.unselectedProcessNode(entityIDs.secondChild).length,
          nodePrimaryButtonCount: simulator.testSubject('resolver:node:primary-button').length,
        }))
      ).toYieldEqualTo({
        selectedOriginCount: 1,
        unselectedFirstChildCount: 1,
        unselectedSecondChildCount: 1,
        nodePrimaryButtonCount: 3,
      });
    });

    it('should render 3 elements with "treeitem" roles, each owned by an element with a "tree" role', async () => {
      await expect(
        simulator.map(() => ({
          nodesOwnedByTrees: simulator.testSubject('resolver:node').filterWhere((domNode) => {
            /**
             * This test verifies corectness w.r.t. the tree/treeitem roles
             * From W3C: `Authors MUST ensure elements with role treeitem are contained in, or owned by, an element with the role group or tree.`
             *
             * https://www.w3.org/TR/wai-aria-1.1/#tree
             * https://www.w3.org/TR/wai-aria-1.1/#treeitem
             *
             * w3c defines two ways for an element to be an "owned element"
             *  1. Any DOM descendant
             *  2. Any element specified as a child via aria-owns
             *  (see: https://www.w3.org/TR/wai-aria-1.1/#dfn-owned-element)
             *
             * In the context of Resolver (as of this writing) nodes/treeitems are children of the tree,
             * but they could be moved out of the tree, provided that the tree is given an `aria-owns`
             * attribute referring to them (method 2 above).
             */
            return domNode.closest('[role="tree"]').length === 1;
          }).length,
        }))
      ).toYieldEqualTo({ nodesOwnedByTrees: 3 });
    });

    it(`should show links to the 3 nodes (with icons) in the node list.`, async () => {
      await expect(
        simulator.map(() => simulator.testSubject('resolver:node-list:node-link:title').length)
      ).toYieldEqualTo(3);
      await expect(
        simulator.map(() => simulator.testSubject('resolver:node-list:node-link:title').length)
      ).toYieldEqualTo(3);
    });

    describe("when the second child node's first button has been clicked", () => {
      beforeEach(async () => {
        const button = await simulator.resolveWrapper(() =>
          simulator.processNodePrimaryButton(entityIDs.secondChild)
        );
        // Click the second child node's primary button
        if (button) {
          button.simulate('click');
        }
      });
      it('should render the second child node as selected, and the origin as not selected, and the query string should indicate that the second child is selected', async () => {
        await expect(
          simulator.map(() => ({
            // the query string has a key showing that the second child is selected
            search: simulator.historyLocationSearch,
            // the second child is rendered in the DOM, and shows up as selected
            selectedSecondChildNodeCount: simulator.selectedProcessNode(entityIDs.secondChild)
              .length,
            // the origin is in the DOM, but shows up as unselected
            unselectedOriginNodeCount: simulator.unselectedProcessNode(entityIDs.origin).length,
          }))
        ).toYieldEqualTo({
          // Just the second child should be marked as selected in the query string
          search: urlSearch(resolverComponentInstanceID, {
            selectedEntityID: entityIDs.secondChild,
          }),
          // The second child is rendered and has `[aria-selected]`
          selectedSecondChildNodeCount: 1,
          // The origin child is rendered and doesn't have `[aria-selected]`
          unselectedOriginNodeCount: 1,
        });
      });
    });
  });
});

describe('Resolver, when analyzing a tree that has two related events for the origin', () => {
  beforeEach(async () => {
    // create a mock data access layer with related events
    const {
      metadata: dataAccessLayerMetadata,
      dataAccessLayer,
    } = noAncestorsTwoChildrenWithRelatedEventsOnOrigin();

    // save a reference to the entity IDs exposed by the mock data layer
    entityIDs = dataAccessLayerMetadata.entityIDs;

    // save a reference to the `_id` supported by the mock data layer
    databaseDocumentID = dataAccessLayerMetadata.databaseDocumentID;

    // create a resolver simulator, using the data access layer and an arbitrary component instance ID
    simulator = new Simulator({ databaseDocumentID, dataAccessLayer, resolverComponentInstanceID });
  });

  describe('when it has loaded', () => {
    let originBounds: AABB;
    let firstChildBounds: AABB;
    let secondChildBounds: AABB;
    let edgeStartingCoordinates: Vector2[];
    let edgeTerminalCoordinates: Vector2[];
    beforeEach(async () => {
      await expect(
        simulator.map(() => ({
          graphElements: simulator.testSubject('resolver:graph').length,
          graphLoadingElements: simulator.testSubject('resolver:graph:loading').length,
          graphErrorElements: simulator.testSubject('resolver:graph:error').length,
          originNodeButton: simulator.processNodePrimaryButton(entityIDs.origin).length,
        }))
      ).toYieldEqualTo({
        graphElements: 1,
        graphLoadingElements: 0,
        graphErrorElements: 0,
        originNodeButton: 1,
      });

      originBounds = computedNodeBoundaries(entityIDs.origin);
      firstChildBounds = computedNodeBoundaries(entityIDs.firstChild);
      secondChildBounds = computedNodeBoundaries(entityIDs.secondChild);
      edgeStartingCoordinates = computedEdgeStartingCoordinates();
      edgeTerminalCoordinates = computedEdgeTerminalCoordinates();
    });

    it('should have one and only one outgoing edge from the origin node', () => {
      // This winnows edges to the one(s) that "start" under the origin node
      const edgesThatStartUnderneathOrigin = edgeStartingCoordinates.filter(
        coordinateBoundaryFilter(originBounds)
      );
      expect(edgesThatStartUnderneathOrigin).toHaveLength(1);
    });
    it('leaf nodes should each have one and only one incoming edge', () => {
      const edgesThatTerminateUnderneathFirstChild = edgeTerminalCoordinates.filter(
        coordinateBoundaryFilter(firstChildBounds)
      );
      expect(edgesThatTerminateUnderneathFirstChild).toHaveLength(1);

      const edgesThatTerminateUnderneathSecondChild = edgeTerminalCoordinates.filter(
        coordinateBoundaryFilter(secondChildBounds)
      );
      expect(edgesThatTerminateUnderneathSecondChild).toHaveLength(1);
    });

    it('should render a related events button', async () => {
      await expect(
        simulator.map(() => ({
          relatedEventButtons: simulator.processNodeSubmenuButton(entityIDs.origin).length,
        }))
      ).toYieldEqualTo({
        relatedEventButtons: 1,
      });
    });
    describe('when the related events button is clicked', () => {
      beforeEach(async () => {
        const button = await simulator.resolveWrapper(() =>
          simulator.processNodeSubmenuButton(entityIDs.origin)
        );
        if (button) {
          button.simulate('click');
        }
      });
      it('should open the submenu and display exactly one option with the correct count', async () => {
        await expect(
          simulator.map(() =>
            simulator.testSubject('resolver:map:node-submenu-item').map((node) => node.text())
          )
        ).toYieldEqualTo(['2 registry']);
      });
    });
    describe('and when the related events button is clicked again', () => {
      beforeEach(async () => {
        const button = await simulator.resolveWrapper(() =>
          simulator.processNodeSubmenuButton(entityIDs.origin)
        );
        if (button) {
          button.simulate('click');
          button.simulate('click'); // The first click opened the menu, this second click closes it
        }
      });
      it('should close the submenu', async () => {
        await expect(
          simulator.map(() => simulator.testSubject('resolver:map:node-submenu-item').length)
        ).toYieldEqualTo(0);
      });
    });
  });
});

/**
 * Get the integer in a CSS px unit string
 * @param px a string with `px` preceded by numbers
 */
function pxNum(px: string): number {
  return parseInt(px.match(/\d+/)![0], 10);
}

/**
 * Get computed boundaries for process node elements
 */
function computedNodeBoundaries(entityID: string): AABB {
  const { left, top, width, height } = getComputedStyle(
    simulator.processNodeElements({ entityID }).getDOMNode()
  );
  return {
    minimum: [pxNum(left), pxNum(top)],
    maximum: [pxNum(left) + pxNum(width), pxNum(top) + pxNum(height)],
  };
}

/**
 * Coordinates for where the edgelines "start"
 */
function computedEdgeStartingCoordinates(): Vector2[] {
  return simulator.testSubject('resolver:graph:edgeline').map((edge) => {
    const { left, top } = getComputedStyle(edge.getDOMNode());
    return [pxNum(left), pxNum(top)];
  });
}

/**
 * Coordinates for where edgelines "end" (after application of transform)
 */
function computedEdgeTerminalCoordinates(): Vector2[] {
  return simulator.testSubject('resolver:graph:edgeline').map((edge) => {
    const { left, top, width, transform } = getComputedStyle(edge.getDOMNode());
    /**
     * Without the transform in the rotation, edgelines lay flat across the x-axis.
     * Plotting the x/y of the line's terminal point here takes the rotation into account.
     * This could cause tests to break if/when certain adjustments are made to the view that might
     * regress the alignment of nodes and edges.
     */
    const edgeLineRotationInRadians = parseFloat(transform.match(/rotateZ\((-?\d+\.?\d+)/i)![1]);
    const rotateDownTo = Math.sin(edgeLineRotationInRadians) * pxNum(width);
    const rotateLeftTo = Math.cos(edgeLineRotationInRadians) * pxNum(width);
    return [pxNum(left) + rotateLeftTo, pxNum(top) + rotateDownTo];
  });
}

/**
 *
 * @param bounds Get a function that filters x/y of edges to those contained in a certain bounding box
 */
function coordinateBoundaryFilter(bounds: AABB) {
  return (coords: Vector2) => {
    return (
      coords[0] >= bounds.minimum[0] &&
      coords[0] <= bounds.maximum[0] &&
      coords[1] >= bounds.minimum[1] &&
      coords[1] <= bounds.maximum[1]
    );
  };
}
