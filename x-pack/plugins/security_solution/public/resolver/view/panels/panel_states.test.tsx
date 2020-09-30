/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';
import { Simulator } from '../../test_utilities/simulator';
import { pausifyMock } from '../../data_access_layer/mocks/pausify_mock';
import { emptifyMock } from '../../data_access_layer/mocks/emptify_mock';
import { noAncestorsTwoChildrenWithRelatedEventsOnOrigin } from '../../data_access_layer/mocks/no_ancestors_two_children_with_related_events_on_origin';
import { urlSearch } from '../../test_utilities/url_search';
import '../../test_utilities/extend_jest';
import { VoidType } from 'io-ts';

describe('Resolver: panel loading and resolution states', () => {
  let simulator: Simulator;
  const resolverComponentInstanceID = 'resolverPanelStates';
  let memoryHistory: HistoryPackageHistoryInterface<never>;

  const queryStringWithEventDetailSelected = urlSearch(resolverComponentInstanceID, {
    panelParameters: {
      nodeID: 'origin',
      eventCategory: 'registry',
      eventID: 'first related event',
    },
    panelView: 'eventDetail',
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
        });

        memoryHistory.push({
          search: queryStringWithEventDetailSelected,
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

    describe('when the server fails to return event data', () => {
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
        });
        memoryHistory.push({
          search: queryStringWithEventDetailSelected,
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
  });
});
