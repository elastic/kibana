/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { oneAncestorTwoChildren } from '../data_access_layer/mocks/one_ancestor_two_children';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';

let simulator: Simulator;
let databaseDocumentID: string;
let entityIDs: { origin: string; firstChild: string; secondChild: string };

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe('Resolver, when analyzing a tree that has 1 ancestor and 2 children', () => {
  beforeEach(async () => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = oneAncestorTwoChildren();

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
        simulator.mapStateTransitions(() => ({
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
      expect(simulator.processNodeElementLooksSelected(entityIDs.origin)).toBe(true);

      expect(simulator.processNodeElementLooksUnselected(entityIDs.firstChild)).toBe(true);
      expect(simulator.processNodeElementLooksUnselected(entityIDs.secondChild)).toBe(true);

      expect(simulator.processNodeElements().length).toBe(3);
    });

    it(`should have the default "process list" panel present`, async () => {
      expect(simulator.panelElement().length).toBe(1);
      expect(simulator.panelContentElement().length).toBe(1);
      const testSubjectName = simulator
        .panelContentElement()
        .getDOMNode()
        .getAttribute('data-test-subj');
      expect(testSubjectName).toMatch(/process-list/g);
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
      it('should render the second child node as selected, and the first child not as not selected, and the query string should indicate that the second child is selected', async () => {
        await expect(
          simulator.mapStateTransitions(function value() {
            return {
              // the query string has a key showing that the second child is selected
              queryStringSelectedNode: simulator.queryStringValues().selectedNode,
              // the second child is rendered in the DOM, and shows up as selected
              secondChildLooksSelected: simulator.processNodeElementLooksSelected(
                entityIDs.secondChild
              ),
              // the origin is in the DOM, but shows up as unselected
              originLooksUnselected: simulator.processNodeElementLooksUnselected(entityIDs.origin),
            };
          })
        ).toYieldEqualTo({
          // Just the second child should be marked as selected in the query string
          queryStringSelectedNode: [entityIDs.secondChild],
          // The second child is rendered and has `[aria-selected]`
          secondChildLooksSelected: true,
          // The origin child is rendered and doesn't have `[aria-selected]`
          originLooksUnselected: true,
        });
      });
    });
  });
});

describe('Resolver, when analyzing a tree that has some related events', () => {
  beforeEach(async () => {
    // create a mock data access layer with related events
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = oneAncestorTwoChildren({
      withRelatedEvents: [
        ['registry', 'access'],
        ['registry', 'access'],
      ],
    });

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
        simulator.mapStateTransitions(() => ({
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
        simulator.mapStateTransitions(() => ({
          relatedEventButtons: simulator.processNodeRelatedEventButton(entityIDs.origin).length,
        }))
      ).toYieldEqualTo({
        relatedEventButtons: 1,
      });
    });
  });
});
