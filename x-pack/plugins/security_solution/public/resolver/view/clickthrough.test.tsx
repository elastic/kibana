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
          graphElements: simulator.graphElement().length,
          graphLoadingElements: simulator.graphLoadingElement().length,
          graphErrorElements: simulator.graphErrorElement().length,
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
          processNodeCount: simulator.processNodeElements().length,
        }))
      ).toYieldEqualTo({
        selectedOriginCount: 1,
        unselectedFirstChildCount: 1,
        unselectedSecondChildCount: 1,
        processNodeCount: 3,
      });
    });

    it(`should show the node list`, async () => {
      await expect(simulator.map(() => simulator.nodeListElement().length)).toYieldEqualTo(1);
    });

    describe("when the second child node's first button has been clicked", () => {
      beforeEach(() => {
        // Click the first button under the second child element.
        simulator
          .processNodeElements({ entityID: entityIDs.secondChild })
          .find('button')
          .first()
          .simulate('click');
      });
      it('should render the second child node as selected, and the origin as not selected, and the query string should indicate that the second child is selected', async () => {
        await expect(
          simulator.map(() => ({
            // the query string has a key showing that the second child is selected
            queryStringSelectedNode: simulator.queryStringValues().selectedNode,
            // the second child is rendered in the DOM, and shows up as selected
            selectedSecondChildNodeCount: simulator.selectedProcessNode(entityIDs.secondChild)
              .length,
            // the origin is in the DOM, but shows up as unselected
            unselectedOriginNodeCount: simulator.unselectedProcessNode(entityIDs.origin).length,
          }))
        ).toYieldEqualTo({
          // Just the second child should be marked as selected in the query string
          queryStringSelectedNode: [entityIDs.secondChild],
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
    beforeEach(async () => {
      await expect(
        simulator.map(() => ({
          graphElements: simulator.graphElement().length,
          graphLoadingElements: simulator.graphLoadingElement().length,
          graphErrorElements: simulator.graphErrorElement().length,
          originNode: simulator.processNodeElements({ entityID: entityIDs.origin }).length,
        }))
      ).toYieldEqualTo({
        graphElements: 1,
        graphLoadingElements: 0,
        graphErrorElements: 0,
        originNode: 1,
      });
    });

    it('should render a related events button', async () => {
      await expect(
        simulator.map(() => ({
          relatedEventButtons: simulator.processNodeRelatedEventButton(entityIDs.origin).length,
        }))
      ).toYieldEqualTo({
        relatedEventButtons: 1,
      });
    });
  });
});
