/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import type { History as HistoryPackageHistoryInterface } from 'history';
import { createMemoryHistory } from 'history';
import { TestProviders } from '../../../common/mock';
import { NodeEventsListItem } from './node_events_of_type';
import { oneNodeWithPaginatedEvents } from '../../data_access_layer/mocks/one_node_with_paginated_related_events';
import { Simulator } from '../../test_utilities/simulator';
// Extend jest with a custom matcher
import '../../test_utilities/extend_jest';
import { urlSearch } from '../../test_utilities/url_search';
import { useLinkProps } from '../use_link_props';

jest.mock('../use_link_props');
const mockUseLinkProps = useLinkProps as jest.Mock;

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

  describe(`when the URL query string is showing a resolver with nodeID origin, panel view nodeEventsInCategory, and eventCategory registry`, () => {
    beforeEach(() => {
      simulator(); // Initialize simulator in beforeEach to use instance in tests
      act(() => {
        memoryHistory.push({
          search: urlSearch(resolverComponentInstanceID, {
            panelParameters: { nodeID: 'origin', eventCategory: 'registry' },
            panelView: 'nodeEventsInCategory',
          }),
        });
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
        simulator(); // Initialize simulator in beforeEach to use instance in tests
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

describe('<NodeEventsListItem />', () => {
  it('should call custom node onclick when it is available', () => {
    const nodeEventOnClick = jest.fn();
    mockUseLinkProps.mockReturnValue({ href: '#', onClick: jest.fn() });
    const { getByTestId } = render(
      <TestProviders>
        <NodeEventsListItem
          id="test"
          nodeID="test"
          eventCategory="test"
          nodeEventOnClick={nodeEventOnClick}
          event={{
            _id: 'test _id',
            _index: '_index',
            '@timestamp': 1726589803115,
            event: {
              id: 'event id',
            },
          }}
        />
      </TestProviders>
    );
    expect(getByTestId('resolver:panel:node-events-in-category:event-link')).toBeInTheDocument();
    getByTestId('resolver:panel:node-events-in-category:event-link').click();
    expect(nodeEventOnClick).toBeCalledWith({
      documentId: 'test _id',
      indexName: '_index',
      scopeId: 'test',
    });
  });
});
