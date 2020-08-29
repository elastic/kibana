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
import { urlSearch } from '../test_utilities/url_search';

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

  const queryStringWithOriginSelected = urlSearch(resolverComponentInstanceID, {
    selectedEntityID: 'origin',
  });

  describe(`when the URL query string is ${queryStringWithOriginSelected}`, () => {
    beforeEach(() => {
      memoryHistory.push({
        search: queryStringWithOriginSelected,
      });
    });
    it('should show the node details for the origin', async () => {
      await expect(
        simulator().map(() => {
          const titleWrapper = simulator().testSubject('resolver:node-detail:title');
          const titleIconWrapper = simulator().testSubject('resolver:node-detail:title-icon');
          return {
            title: titleWrapper.exists() ? titleWrapper.text() : null,
            titleIcon: titleIconWrapper.exists() ? titleIconWrapper.text() : null,
            detailEntries: simulator().nodeDetailDescriptionListEntries(),
          };
        })
      ).toYieldEqualTo({
        title: 'c.ext',
        titleIcon: 'Running Process',
        detailEntries: [
          ['process.executable', 'executable'],
          ['process.pid', '0'],
          ['user.name', 'user.name'],
          ['user.domain', 'user.domain'],
          ['process.parent.pid', '0'],
          ['process.hash.md5', 'hash.md5'],
          ['process.args', 'args'],
        ],
      });
    });
    it('should have breaking opportunities (<wbr>s) in node titles to allow wrapping', async () => {
      await expect(
        simulator().map(() => {
          const titleWrapper = simulator().testSubject('resolver:node-detail:title');
          return {
            wordBreaks: titleWrapper.find('wbr').length,
          };
        })
      ).toYieldEqualTo({
        // The GeneratedText component adds 1 <wbr> after the period and one at the end
        wordBreaks: 2,
      });
    });
  });

  const queryStringWithFirstChildSelected = urlSearch(resolverComponentInstanceID, {
    selectedEntityID: 'firstChild',
  });

  describe(`when the URL query string is ${queryStringWithFirstChildSelected}`, () => {
    beforeEach(() => {
      memoryHistory.push({
        search: queryStringWithFirstChildSelected,
      });
    });
    it('should show the node details for the first child', async () => {
      await expect(
        simulator().map(() => simulator().nodeDetailDescriptionListEntries())
      ).toYieldEqualTo([
        ['process.executable', 'executable'],
        ['process.pid', '1'],
        ['user.name', 'user.name'],
        ['user.domain', 'user.domain'],
        ['process.parent.pid', '0'],
        ['process.hash.md5', 'hash.md5'],
        ['process.args', 'args'],
      ]);
    });
  });

  it('should have 3 nodes (with icons) in the node list', async () => {
    await expect(
      simulator().map(() => simulator().testSubject('resolver:node-list:node-link:title').length)
    ).toYieldEqualTo(3);
    await expect(
      simulator().map(() => simulator().testSubject('resolver:node-list:node-link:icon').length)
    ).toYieldEqualTo(3);
  });

  describe('when there is an item in the node list and its text has been clicked', () => {
    beforeEach(async () => {
      const nodeLinks = await simulator().resolve('resolver:node-list:node-link:title');
      expect(nodeLinks).toBeTruthy();
      if (nodeLinks) {
        nodeLinks.first().simulate('click');
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
      await expect(simulator().map(() => simulator().historyLocationSearch)).toYieldEqualTo(
        urlSearch(resolverComponentInstanceID, {
          selectedEntityID: entityIDs.origin,
        })
      );
    });
    describe('and when the node list link has been clicked', () => {
      beforeEach(async () => {
        const nodeListLink = await simulator().resolve(
          'resolver:node-detail:breadcrumbs:node-list-link'
        );
        if (nodeListLink) {
          nodeListLink.simulate('click');
        }
      });
      it('should show the list of nodes with links to each node', async () => {
        await expect(
          simulator().map(() => {
            return simulator()
              .testSubject('resolver:node-list:node-link:title')
              .map((node) => node.text());
          })
        ).toYieldEqualTo(['c.ext', 'd', 'e']);
      });
    });
  });
});
