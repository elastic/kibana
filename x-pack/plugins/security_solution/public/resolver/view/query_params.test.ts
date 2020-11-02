/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';
import { urlSearch } from '../test_utilities/url_search';

let simulator: Simulator;
let databaseDocumentID: string;
let entityIDs: { origin: string; firstChild: string; secondChild: string };

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'oldID';

describe('Resolver, when analyzing a tree that has no ancestors and 2 children', () => {
  beforeEach(async () => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = noAncestorsTwoChildren();

    // save a reference to the entity IDs exposed by the mock data layer
    entityIDs = dataAccessLayerMetadata.entityIDs;

    // save a reference to the `_id` supported by the mock data layer
    databaseDocumentID = dataAccessLayerMetadata.databaseDocumentID;

    // create a resolver simulator, using the data access layer and an arbitrary component instance ID
    simulator = new Simulator({
      databaseDocumentID,
      dataAccessLayer,
      resolverComponentInstanceID,
      indices: [],
    });
  });

  describe("when the second child node's first button has been clicked", () => {
    beforeEach(async () => {
      const button = await simulator.resolveWrapper(() =>
        simulator.processNodePrimaryButton(entityIDs.secondChild)
      );
      if (button) {
        // Click the first button under the second child element.
        button.simulate('click', { button: 0 });
      }
    });
    const queryStringWithOriginSelected = urlSearch(resolverComponentInstanceID, {
      panelParameters: { nodeID: 'secondChild' },
      panelView: 'nodeDetail',
    });
    it(`should have a url search of ${queryStringWithOriginSelected}`, async () => {
      await expect(simulator.map(() => simulator.historyLocationSearch)).toYieldEqualTo(
        urlSearch(resolverComponentInstanceID, {
          panelParameters: { nodeID: 'secondChild' },
          panelView: 'nodeDetail',
        })
      );
    });
    describe('when the resolver component gets unmounted', () => {
      beforeEach(() => {
        simulator.unmount();
      });
      it('should have a history location search of `""`', async () => {
        await expect(simulator.map(() => simulator.historyLocationSearch)).toYieldEqualTo('');
      });
    });
    describe('when the resolver component has its component instance ID changed', () => {
      const newInstanceID = 'newID';
      beforeEach(() => {
        simulator.resolverComponentInstanceID = newInstanceID;
      });
      it('should have a history location search of `""`', async () => {
        await expect(simulator.map(() => simulator.historyLocationSearch)).toYieldEqualTo('');
      });
      describe("when the user clicks the second child node's button again", () => {
        beforeEach(async () => {
          const button = await simulator.resolveWrapper(() =>
            simulator.processNodePrimaryButton(entityIDs.secondChild)
          );
          if (button) {
            // Click the first button under the second child element.
            button.simulate('click', { button: 0 });
          }
        });
        it(`should have a url search of ${urlSearch(newInstanceID, {
          panelParameters: { nodeID: 'secondChild' },
          panelView: 'nodeDetail',
        })}`, async () => {
          await expect(simulator.map(() => simulator.historyLocationSearch)).toYieldEqualTo(
            urlSearch(newInstanceID, {
              panelParameters: { nodeID: 'secondChild' },
              panelView: 'nodeDetail',
            })
          );
        });
      });
    });
  });
});
