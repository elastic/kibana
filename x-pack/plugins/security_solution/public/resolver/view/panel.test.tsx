/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from '../data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';
import { urlSearch } from '../test_utilities/url_search';

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe(`Resolver: when analyzing a tree with no ancestors and two children and two related registry event on the origin, and when the component instance ID is ${resolverComponentInstanceID}`, () => {
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
    const {
      metadata: dataAccessLayerMetadata,
      dataAccessLayer,
    } = noAncestorsTwoChildrenWithRelatedEventsOnOrigin();

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
          indices: [],
        });
        return simulatorInstance;
      }
    };
  });

  afterEach(() => {
    simulatorInstance = undefined;
  });

  const queryStringWithOriginSelected = urlSearch(resolverComponentInstanceID, {
    panelParameters: { nodeID: 'origin' },
    panelView: 'nodeDetail',
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
          ['@timestamp', 'Sep 23, 2020 @ 08:25:32.316'],
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
    it('should allow all node details to be copied', async () => {
      const copyableFields = await simulator().resolve('resolver:panel:copyable-field');

      copyableFields?.map((copyableField) => {
        copyableField.simulate('mouseenter');
        simulator().testSubject('resolver:panel:clipboard').last().simulate('click');
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(copyableField.text());
        copyableField.simulate('mouseleave');
      });
    });
  });

  const queryStringWithFirstChildSelected = urlSearch(resolverComponentInstanceID, {
    panelParameters: { nodeID: 'firstChild' },
    panelView: 'nodeDetail',
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
        ['@timestamp', 'Sep 23, 2020 @ 08:25:32.317'],
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

  it('should show a single analyzed event in the node list', async () => {
    await expect(
      simulator().map(
        () => simulator().testSubject('resolver:node-list:node-link:analyzed-event').length
      )
    ).toYieldEqualTo(1);
  });

  it('should have 3 nodes (with icons) in the node list', async () => {
    await expect(
      simulator().map(() => simulator().testSubject('resolver:node-list:node-link:title').length)
    ).toYieldEqualTo(3);
    await expect(
      simulator().map(() => simulator().testSubject('resolver:node-list:node-link:icon').length)
    ).toYieldEqualTo(3);
  });

  it('should be able to copy the timestamps for all 3 nodes', async () => {
    const copyableFields = await simulator().resolve('resolver:panel:copyable-field');

    expect(copyableFields?.length).toBe(3);

    copyableFields?.map((copyableField) => {
      copyableField.simulate('mouseenter');
      simulator().testSubject('resolver:panel:clipboard').last().simulate('click');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(copyableField.text());
      copyableField.simulate('mouseleave');
    });
  });

  describe('when there is an item in the node list and its text has been clicked', () => {
    beforeEach(async () => {
      const nodeLinks = await simulator().resolve('resolver:node-list:node-link:title');
      expect(nodeLinks).toBeTruthy();
      if (nodeLinks) {
        nodeLinks.first().simulate('click', { button: 0 });
      }
    });
    it('should show the details for the first node', async () => {
      await expect(
        simulator().map(() => simulator().nodeDetailDescriptionListEntries())
      ).toYieldEqualTo([
        ['@timestamp', 'Sep 23, 2020 @ 08:25:32.316'],
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
          panelView: 'nodeDetail',
          panelParameters: {
            nodeID: entityIDs.origin,
          },
        })
      );
    });
    describe("and when the user clicks the link to the node's events", () => {
      beforeEach(async () => {
        const nodeEventsListLink = await simulator().resolve(
          'resolver:node-detail:node-events-link'
        );

        if (nodeEventsListLink) {
          nodeEventsListLink.simulate('click', { button: 0 });
        }
      });
      it('should show a link to view 2 registry events', async () => {
        await expect(
          simulator().map(() => {
            // The link text is split across two columns. The first column is the count and the second column has the type.
            const type = simulator().testSubject('resolver:panel:node-events:event-type-count');
            const link = simulator().testSubject('resolver:panel:node-events:event-type-link');
            return {
              typeLength: type.length,
              linkLength: link.length,
              typeText: type.text(),
              linkText: link.text(),
            };
          })
        ).toYieldEqualTo({
          typeLength: 1,
          linkLength: 1,
          linkText: 'registry',
          // EUI's Table adds the column name to the value.
          typeText: 'Count2',
        });
      });
      describe('and when the user clicks the registry events link', () => {
        beforeEach(async () => {
          const link = await simulator().resolve('resolver:panel:node-events:event-type-link');
          const first = link?.first();
          expect(first).toBeTruthy();

          if (first) {
            first.simulate('click', { button: 0 });
          }
        });
        it('should show links to two events', async () => {
          await expect(
            simulator().map(
              () =>
                simulator().testSubject('resolver:panel:node-events-in-category:event-link').length
            )
          ).toYieldEqualTo(2);
        });
        describe('and when the first event link is clicked', () => {
          beforeEach(async () => {
            const link = await simulator().resolve(
              'resolver:panel:node-events-in-category:event-link'
            );
            const first = link?.first();
            expect(first).toBeTruthy();

            if (first) {
              first.simulate('click', { button: 0 });
            }
          });
          it('should show the event detail view', async () => {
            await expect(
              simulator().map(() => simulator().testSubject('resolver:panel:event-detail').length)
            ).toYieldEqualTo(1);
          });
          it('should allow all fields to be copied', async () => {
            const copyableFields = await simulator().resolve('resolver:panel:copyable-field');

            copyableFields?.map((copyableField) => {
              copyableField.simulate('mouseenter');
              simulator().testSubject('resolver:panel:clipboard').last().simulate('click');
              expect(navigator.clipboard.writeText).toHaveBeenCalledWith(copyableField.text());
              copyableField.simulate('mouseleave');
            });
          });
        });
      });
    });
    describe('and when the node list link has been clicked', () => {
      beforeEach(async () => {
        const nodeListLink = await simulator().resolve(
          'resolver:node-detail:breadcrumbs:node-list-link'
        );
        if (nodeListLink) {
          nodeListLink.simulate('click', { button: 0 });
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
