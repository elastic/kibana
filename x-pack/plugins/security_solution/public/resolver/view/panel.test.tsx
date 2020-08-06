/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';

import { noAncestorsTwoChildren } from '../data_access_layer/mocks/no_ancestors_two_children';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe(`Resolver: when analyzing a tree with no ancestors and two children, and when the component instance ID is ${resolverComponentInstanceID}`, () => {
  /**
   * Get (or lazily create and get) the simulator.
   */
  let simulator: () => Simulator;
  /** lazily populated by `simulator`. */
  let simulatorInstance: Simulator | undefined;
  let memoryHistory: HistoryPackageHistoryInterface<never>;

  // node IDs used by the generator
  let entityIDs: {
    origin: string;
    firstChild: string;
    secondChild: string;
  };

  beforeEach(() => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = noAncestorsTwoChildren();

    entityIDs = dataAccessLayerMetadata.entityIDs;

    memoryHistory = createMemoryHistory();

    // create a resolver simulator, using the data access layer and an arbitrary component instance ID
    simulator = () => {
      if (simulatorInstance) {
        return simulatorInstance;
      } else {
        simulatorInstance = new Simulator({
          databaseDocumentID: dataAccessLayerMetadata.databaseDocumentID,
          dataAccessLayer,
          resolverComponentInstanceID,
          history: memoryHistory,
        });
        return simulatorInstance;
      }
    };
  });

  afterEach(() => {
    simulatorInstance = undefined;
  });

  describe('when the URL query string is  query string has the origin node entity ID selected', () => {
    beforeEach(() => {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.set(`resolver-${resolverComponentInstanceID}-id`, 'origin');
      memoryHistory.push({
        search: urlSearchParams.toString(),
      });
    });
    it('should show the node details', async () => {
      // TODO, make the details of each node unique enough that the test will fail if the wrong node is selected.
      await expect(
        simulator().map(() => simulator().nodeDetailDescriptionListEntries())
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

  it('should show the node list', async () => {
    await expect(simulator().map(() => simulator().nodeListElement().length)).toYieldEqualTo(1);
  });

  it('should have 3 nodes in the node list', async () => {
    await expect(simulator().map(() => simulator().nodeListItems().length)).toYieldEqualTo(3);
  });
  describe('when there is an item in the node list and it has been clicked', () => {
    beforeEach(async () => {
      const nodeListItems = await simulator().resolveWrapper(() => simulator().nodeListItems());
      expect(nodeListItems && nodeListItems.length).toBeTruthy();
      if (nodeListItems) {
        nodeListItems.first().find('button').simulate('click');
      }
    });
    it('should show the details for the first node', async () => {
      await expect(
        simulator().map(() => simulator().nodeDetailDescriptionListEntries())
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
    it("should have the first node's ID in the query string", async () => {
      await expect(simulator().map(() => simulator().queryStringValues())).toYieldEqualTo({
        selectedNode: [entityIDs.origin],
      });
    });
  });
});
