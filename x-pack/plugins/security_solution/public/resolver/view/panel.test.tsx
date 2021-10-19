/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from '../data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { Simulator } from '../test_utilities/simulator';
// Extend jest with a custom matcher
import '../test_utilities/extend_jest';
import { urlSearch } from '../test_utilities/url_search';

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe(`Resolver: when analyzing a tree with no ancestors and two children and 2 related registry events and 1 event of each other category on the origin, and when the component instance ID is ${resolverComponentInstanceID}`, () => {
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

  /**
   * These are the details we expect to see in the node detail view when the origin is selected.
   */
  const originEventDetailEntries: Array<[string, string]> = [
    ['@timestamp', 'Sep 23, 2020 @ 08:25:32.316'],
    ['process.executable', 'executable'],
    ['process.pid', '0'],
    ['user.name', 'user.name'],
    ['user.domain', 'user.domain'],
    ['process.parent.pid', '0'],
    ['process.hash.md5', 'hash.md5'],
    ['process.args', 'args0'],
    ['process.args', 'args1'],
    ['process.args', 'args2'],
  ];

  beforeEach(() => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } =
      noAncestorsTwoChildrenWithRelatedEventsOnOrigin();

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
          shouldUpdate: false,
          filters: {},
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
        detailEntries: [...originEventDetailEntries],
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

    /**
     * These tests use a statically defined map of fields and expected values. The test finds the `dt` for each field and then finds the related `dd`s. From there it finds a special 'hover area' (via `data-test-subj`) and simulates a `mouseenter` on it. This is because the feature work by adding event listeners to `div`s. There is no way for the user to know that the `div`s are interactable.

     * Finally the test clicks a button and checks that the clipboard was written to.
     */
    describe.each([...originEventDetailEntries])(
      'when the user hovers over the description for the field (%p) with their mouse',
      (fieldTitleText, value) => {
        // If there are multiple values for a field, i.e. an array, this is the index for the value we are testing.
        const entryIndex = originEventDetailEntries
          .filter(([fieldName]) => fieldName === fieldTitleText)
          .findIndex(([_, fieldValue]) => fieldValue === value);
        beforeEach(async () => {
          const dt = await simulator().resolveWrapper(() => {
            return simulator()
              .testSubject('resolver:node-detail:entry-title')
              .filterWhere((title) => title.text() === fieldTitleText)
              .at(entryIndex);
          });

          expect(dt).toHaveLength(1);

          const copyableFieldHoverArea = simulator()
            .descriptionDetails(dt!)
            // The copyable field popup does not use a button as a trigger. It is instead triggered by mouse interaction with this `div`.
            .find(`[data-test-subj="resolver:panel:copyable-field-hover-area"]`)
            .filterWhere(Simulator.isDOM);

          expect(copyableFieldHoverArea).toHaveLength(1);
          copyableFieldHoverArea?.simulate('mouseenter');
        });
        describe('and when they click the copy-to-clipboard button', () => {
          beforeEach(async () => {
            const copyButton = await simulator().resolve('resolver:panel:clipboard');
            expect(copyButton).toHaveLength(1);
            copyButton?.simulate('click');
            simulator().confirmTextWrittenToClipboard();
          });
          it(`should write ${value} to the clipboard`, async () => {
            await expect(simulator().map(() => simulator().clipboardText)).toYieldEqualTo(value);
          });
        });
      }
    );
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
        ['process.args', 'args0'],
        ['process.args', 'args1'],
        ['process.args', 'args2'],
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
      simulator().map(() => {
        return {
          titleCount: simulator().testSubject('resolver:node-list:node-link:title').length,
          iconCount: simulator().testSubject('resolver:node-list:node-link:icon').length,
        };
      })
    ).toYieldEqualTo({ titleCount: 3, iconCount: 3 });
  });

  describe('when the user hovers over the timestamp for "c.ext" with their mouse', () => {
    beforeEach(async () => {
      const cExtHoverArea = await simulator().resolveWrapper(async () => {
        const nodeLinkTitles = await simulator().resolve('resolver:node-list:node-link:title');

        expect(nodeLinkTitles).toHaveLength(3);

        return (
          nodeLinkTitles!
            .filterWhere((linkTitle) => linkTitle.text() === 'c.ext')
            // Find the parent `tr` and the find all hover areas in that TR. The test assumes that all cells in a row are associated.
            .closest('tr')
            // The copyable field popup does not use a button as a trigger. It is instead triggered by mouse interaction with this `div`.
            .find('[data-test-subj="resolver:panel:copyable-field-hover-area"]')
            .filterWhere(Simulator.isDOM)
        );
      });
      cExtHoverArea?.simulate('mouseenter');
    });
    describe('and when the user clicks the copy-to-clipboard button', () => {
      beforeEach(async () => {
        (await simulator().resolve('resolver:panel:clipboard'))?.simulate('click');
        simulator().confirmTextWrittenToClipboard();
      });
      const expected = 'Sep 23, 2020 @ 08:25:32.316';
      it(`should write "${expected}" to the clipboard`, async () => {
        await expect(simulator().map(() => simulator().clipboardText)).toYieldEqualTo(expected);
      });
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
      ).toYieldEqualTo([...originEventDetailEntries]);
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
            const typesAndCounts: Array<{ type: string; link: string }> = [];
            const type = simulator().testSubject('resolver:panel:node-events:event-type-count');
            const link = simulator().testSubject('resolver:panel:node-events:event-type-link');
            for (let index = 0; index < type.length; index++) {
              typesAndCounts.push({
                type: type.at(index).text(),
                link: link.at(index).text(),
              });
            }
            return typesAndCounts;
          })
        ).toYieldEqualTo([
          // Because there is no printed whitespace after "Count", the count immediately follows it.
          { link: 'registry', type: 'Count2' },
          { link: 'authentication', type: 'Count1' },
          { link: 'database', type: 'Count1' },
          { link: 'driver', type: 'Count1' },
          { link: 'file', type: 'Count1' },
          { link: 'host', type: 'Count1' },
          { link: 'iam', type: 'Count1' },
          { link: 'intrusion_detection', type: 'Count1' },
          { link: 'malware', type: 'Count1' },
          { link: 'network', type: 'Count1' },
          { link: 'package', type: 'Count1' },
          { link: 'process', type: 'Count1' },
          { link: 'web', type: 'Count1' },
        ]);
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
          describe.each([['user.domain', 'user.domain']])(
            'when the user hovers over the description for the field "%p"',
            (fieldName, expectedValue) => {
              beforeEach(async () => {
                const fieldHoverArea = await simulator().resolveWrapper(async () => {
                  const dt = (
                    await simulator().resolve('resolver:panel:event-detail:event-field-title')
                  )?.filterWhere((title) => title.text() === fieldName);
                  return (
                    simulator()
                      .descriptionDetails(dt!)
                      // The copyable field popup does not use a button as a trigger. It is instead triggered by mouse interaction with this `div`.
                      .find(`[data-test-subj="resolver:panel:copyable-field-hover-area"]`)
                      .filterWhere(Simulator.isDOM)
                  );
                });
                expect(fieldHoverArea).toBeTruthy();
                fieldHoverArea?.simulate('mouseenter');
              });
              describe('when the user clicks on the clipboard button', () => {
                beforeEach(async () => {
                  const button = await simulator().resolve('resolver:panel:clipboard');
                  expect(button).toBeTruthy();
                  button?.simulate('click');
                  simulator().confirmTextWrittenToClipboard();
                });
                it(`should write ${expectedValue} to the clipboard`, async () => {
                  await expect(simulator().map(() => simulator().clipboardText)).toYieldEqualTo(
                    expectedValue
                  );
                });
              });
            }
          );
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
        ).toYieldEqualTo([
          'c.ext',
          'd',
          'really_really_really_really_really_really_really_really_really_really_really_really_really_really_long_node_name',
        ]);
      });
    });
  });
});
