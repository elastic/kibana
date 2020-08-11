/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';

describe('Resolver: when analyzing a tree with no ancestors and two children', () => {
  let simulator: Simulator;
  let databaseDocumentID: string;

  // the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
  const resolverComponentInstanceID = 'resolverComponentInstanceID';

  beforeEach(async () => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = noAncestorsTwoChildren();

    // save a reference to the `_id` supported by the mock data layer
    databaseDocumentID = dataAccessLayerMetadata.databaseDocumentID;

    // create a resolver simulator, using the data access layer and an arbitrary component instance ID
    simulator = new Simulator({ databaseDocumentID, dataAccessLayer, resolverComponentInstanceID });
  });

  it('should show the node list', async () => {
    await expect(simulator.map(() => simulator.nodeListElement().length)).toYieldEqualTo(1);
  });

  it('should have 3 nodes in the node list', async () => {
    await expect(simulator.map(() => simulator.nodeListItems().length)).toYieldEqualTo(3);
  });
  describe('when there is an item in the node list and it has been clicked', () => {
    beforeEach(async () => {
      const nodeListItems = await simulator.resolveWrapper(() => simulator.nodeListItems());
      expect(nodeListItems && nodeListItems.length).toBeTruthy();
      if (nodeListItems) {
        nodeListItems.first().find('button').simulate('click');
      }
    });
    it('should show the details for the first node', async () => {
      await expect(
        simulator.map(() => simulator.nodeDetailDescriptionListEntries())
      ).toYieldEqualTo([
        ['process.executable', 'executable'],
        ['process.pid', '0'],
        ['user.name', 'user.name'],
        ['user.domain', 'user.domain'],
        ['process.parent.pid', '0'],
        ['process.hash.md5', 'hash.md5'],
        ['process.args', 'args'],
      ]);
    });
  });
});
