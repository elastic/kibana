/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';

import { oneNodeWithPaginatedEvents } from '../../data_access_layer/mocks/one_node_with_paginated_related_events';
import { Simulator } from '../../test_utilities/simulator';
// Extend jest with a custom matcher
import '../../test_utilities/extend_jest';
import { urlSearch } from '../../test_utilities/url_search';

// the resolver component instance ID, used by the react code to distinguish piece of global state from those used by other resolver instances
const resolverComponentInstanceID = 'resolverComponentInstanceID';

describe(`Resolver: when analyzing a tree with only the origin and paginated related events, and when the component instance ID is ${resolverComponentInstanceID}`, () => {
  /**
   * Get (or lazily create and get) the simulator.
   */
  let simulator: () => Simulator;
  /** lazily populated by `simulator`. */
  let simulatorInstance: Simulator | undefined;
  let memoryHistory: HistoryPackageHistoryInterface<never>;

  beforeEach(() => {
    // create a mock data access layer
    const { metadata: dataAccessLayerMetadata, dataAccessLayer } = oneNodeWithPaginatedEvents();

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

  describe(`when the URL query string is showing a resolver with nodeID origin, panel view nodeEventsInCategory, and eventCategory registry`, () => {
    beforeEach(() => {
      memoryHistory.push({
        search: urlSearch(resolverComponentInstanceID, {
          panelParameters: { nodeID: 'origin', eventCategory: 'registry' },
          panelView: 'nodeEventsInCategory',
        }),
      });
    });
    it('should show the load more data button', async () => {
      await expect(
        simulator().map(() => ({
          loadMoreButton: simulator().testSubject('resolver:nodeEventsInCategory:loadMore').length,
          visibleEvents: simulator().testSubject(
            'resolver:panel:node-events-in-category:event-link'
          ).length,
        }))
      ).toYieldEqualTo({
        loadMoreButton: 1,
        visibleEvents: 25,
      });
    });
    describe('when the user clicks the load more button', () => {
      beforeEach(async () => {
        const loadMore = await simulator().resolve('resolver:nodeEventsInCategory:loadMore');
        if (loadMore) {
          loadMore.simulate('click', { button: 0 });
        }
      });
      it('should hide the load more button and show all 30 events', async () => {
        await expect(
          simulator().map(() => ({
            loadMoreButton: simulator().testSubject('resolver:nodeEventsInCategory:loadMore')
              .length,
            visibleEvents: simulator().testSubject(
              'resolver:panel:node-events-in-category:event-link'
            ).length,
          }))
        ).toYieldEqualTo({
          loadMoreButton: 0,
          visibleEvents: 30,
        });
      });
    });
  });
});
