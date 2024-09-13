/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import type { History as HistoryPackageHistoryInterface } from 'history';
import { createMemoryHistory } from 'history';
import { Simulator } from '../../test_utilities/simulator';
import { pausifyMock } from '../../data_access_layer/mocks/pausify_mock';
import { emptifyMock } from '../../data_access_layer/mocks/emptify_mock';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from '../../data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { firstRelatedEventID } from '../../mocks/resolver_tree';
import { urlSearch } from '../../test_utilities/url_search';
import '../../test_utilities/extend_jest';

describe('Resolver: panel loading and resolution states', () => {
  let simulator: Simulator;
  const resolverComponentInstanceID = 'resolverPanelStates';
  let memoryHistory: HistoryPackageHistoryInterface<never>;

  const queryStringWithEventDetailSelected = urlSearch(resolverComponentInstanceID, {
    panelParameters: {
      nodeID: 'origin',
      eventCategory: 'registry',
      eventID: firstRelatedEventID,
      eventTimestamp: '0',
      winlogRecordID: '0',
    },
    panelView: 'eventDetail',
  });

  const queryStringWithEventsInCategorySelected = urlSearch(resolverComponentInstanceID, {
    panelParameters: {
      nodeID: 'origin',
      eventCategory: 'registry',
    },
    panelView: 'nodeEventsInCategory',
  });

  const queryStringWithNodeDetailSelected = urlSearch(resolverComponentInstanceID, {
    panelParameters: {
      nodeID: 'origin',
    },
    panelView: 'nodeDetail',
  });

  describe('When analyzing a tree with no ancestors and two children with related events on the origin', () => {
    describe('when navigating to the event detail panel', () => {
      let resumeRequest: (pausableRequest: ['event']) => void;
      beforeEach(() => {
        const {
          metadata: { databaseDocumentID },
          dataAccessLayer,
          pause,
          resume,
        } = pausifyMock(noAncestorsTwoChildrenWithRelatedEventsOnOrigin());

        resumeRequest = resume;
        memoryHistory = createMemoryHistory();
        pause(['event']);

        simulator = new Simulator({
          dataAccessLayer,
          databaseDocumentID,
          history: memoryHistory,
          resolverComponentInstanceID,
          indices: [],
          shouldUpdate: false,
          filters: {},
        });

        act(() => {
          memoryHistory.push({
            search: queryStringWithEventDetailSelected,
          });
        });
      });

      it('should display a loading state in the panel', async () => {
        await expect(
          simulator.map(() => ({
            resolverPanelLoading: simulator.testSubject('resolver:panel:loading').length,
            resolverPanelEventDetail: simulator.testSubject('resolver:panel:event-detail').length,
          }))
        ).toYieldEqualTo({
          resolverPanelLoading: 1,
          resolverPanelEventDetail: 0,
        });
      });

      it('should successfully load the event detail panel', async () => {
        await resumeRequest(['event']);
        await expect(
          simulator.map(() => ({
            resolverPanelLoading: simulator.testSubject('resolver:panel:loading').length,
            resolverPanelEventDetail: simulator.testSubject('resolver:panel:event-detail').length,
          }))
        ).toYieldEqualTo({
          resolverPanelLoading: 0,
          resolverPanelEventDetail: 1,
        });
      });
    });

    describe('when the server fails to return event data on the event detail panel', () => {
      beforeEach(() => {
        const {
          metadata: { databaseDocumentID },
          dataAccessLayer,
        } = emptifyMock(noAncestorsTwoChildrenWithRelatedEventsOnOrigin(), ['event']);
        memoryHistory = createMemoryHistory();
        simulator = new Simulator({
          dataAccessLayer,
          databaseDocumentID,
          history: memoryHistory,
          resolverComponentInstanceID,
          indices: [],
          shouldUpdate: false,
          filters: {},
        });
        act(() => {
          memoryHistory.push({
            search: queryStringWithEventDetailSelected,
          });
        });
      });

      it('should display an error state in the panel', async () => {
        await expect(
          simulator.map(() => ({
            resolverPanelError: simulator.testSubject('resolver:panel:error').length,
            resolverPanelEventDetail: simulator.testSubject('resolver:panel:event-detail').length,
          }))
        ).toYieldEqualTo({
          resolverPanelError: 1,
          resolverPanelEventDetail: 0,
        });
      });
    });

    describe('when navigating to the event categories panel', () => {
      let resumeRequest: (pausableRequest: ['eventsWithEntityIDAndCategory']) => void;
      beforeEach(() => {
        const {
          metadata: { databaseDocumentID },
          dataAccessLayer,
          pause,
          resume,
        } = pausifyMock(noAncestorsTwoChildrenWithRelatedEventsOnOrigin());

        resumeRequest = resume;
        memoryHistory = createMemoryHistory();
        pause(['eventsWithEntityIDAndCategory']);

        simulator = new Simulator({
          dataAccessLayer,
          databaseDocumentID,
          history: memoryHistory,
          resolverComponentInstanceID,
          indices: [],
          shouldUpdate: false,
          filters: {},
        });

        act(() => {
          memoryHistory.push({
            search: queryStringWithEventsInCategorySelected,
          });
        });
      });

      it('should display a loading state in the panel', async () => {
        await expect(
          simulator.map(() => ({
            resolverPanelLoading: simulator.testSubject('resolver:panel:loading').length,
            resolverPanelEventsInCategory: simulator.testSubject(
              'resolver:panel:events-in-category'
            ).length,
          }))
        ).toYieldEqualTo({
          resolverPanelLoading: 1,
          resolverPanelEventsInCategory: 0,
        });
      });

      it('should successfully load the events in category panel', async () => {
        await resumeRequest(['eventsWithEntityIDAndCategory']);
        await expect(
          simulator.map(() => ({
            resolverPanelLoading: simulator.testSubject('resolver:panel:loading').length,
            resolverPanelEventsInCategory: simulator.testSubject(
              'resolver:panel:events-in-category'
            ).length,
          }))
        ).toYieldEqualTo({
          resolverPanelLoading: 0,
          resolverPanelEventsInCategory: 1,
        });
      });
    });

    describe('when navigating to the node detail panel', () => {
      let resumeRequest: (pausableRequest: ['nodeData']) => void;
      beforeEach(() => {
        const {
          metadata: { databaseDocumentID },
          dataAccessLayer,
          pause,
          resume,
        } = pausifyMock(noAncestorsTwoChildrenWithRelatedEventsOnOrigin());

        resumeRequest = resume;
        memoryHistory = createMemoryHistory();
        pause(['nodeData']);

        simulator = new Simulator({
          dataAccessLayer,
          databaseDocumentID,
          history: memoryHistory,
          resolverComponentInstanceID,
          indices: [],
          shouldUpdate: false,
          filters: {},
        });

        act(() => {
          memoryHistory.push({
            search: queryStringWithNodeDetailSelected,
          });
        });
      });

      it('should display a loading state in the panel', async () => {
        await expect(
          simulator.map(() => ({
            resolverPanelLoading: simulator.testSubject('resolver:panel:loading').length,
            resolverPanelEventsInCategory: simulator.testSubject('resolver:panel:node-detail')
              .length,
          }))
        ).toYieldEqualTo({
          resolverPanelLoading: 1,
          resolverPanelEventsInCategory: 0,
        });
      });

      it('should successfully load the events in category panel', async () => {
        await resumeRequest(['nodeData']);
        await expect(
          simulator.map(() => ({
            resolverPanelLoading: simulator.testSubject('resolver:panel:loading').length,
            resolverPanelEventsInCategory: simulator.testSubject('resolver:panel:node-detail')
              .length,
          }))
        ).toYieldEqualTo({
          resolverPanelLoading: 0,
          resolverPanelEventsInCategory: 1,
        });
      });
    });
  });
});
