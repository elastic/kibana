/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { DataAction } from './action';
import { dataReducer } from './reducer';
import {
  DataState,
  RelatedEventDataEntry,
  RelatedEventDataEntryWithStats,
  RelatedEventData,
} from '../../types';
import { ResolverEvent } from '../../../../common/endpoint/types';
import { relatedEventStats, relatedEvents } from './selectors';

describe('resolver data selectors', () => {
  const store: Store<DataState, DataAction> = createStore(dataReducer, undefined);
  describe('when related event data is reduced into state with no results', () => {
    let relatedEventInfoBeforeAction: RelatedEventData;
    beforeEach(() => {
      relatedEventInfoBeforeAction = new Map(relatedEvents(store.getState()) || []);
      const payload: Map<ResolverEvent, RelatedEventDataEntry> = new Map();
      const action: DataAction = { type: 'serverReturnedRelatedEventData', payload };
      store.dispatch(action);
    });
    it('should have the same related info as before the action', () => {
      const relatedInfoAfterAction = relatedEvents(store.getState());
      expect(relatedInfoAfterAction).toEqual(relatedEventInfoBeforeAction);
    });
  });
  describe('when related event data is reduced into state with 2 dns results', () => {
    let mockBaseEvent: ResolverEvent;
    beforeEach(() => {
      mockBaseEvent = {} as ResolverEvent;
      function dnsRelatedEventEntry() {
        const fakeEvent = {} as ResolverEvent;
        return { relatedEvent: fakeEvent, relatedEventType: 'dns' };
      }
      const payload: Map<ResolverEvent, RelatedEventDataEntry> = new Map([
        [
          mockBaseEvent,
          {
            relatedEvents: [dnsRelatedEventEntry(), dnsRelatedEventEntry()],
          },
        ],
      ]);
      const action: DataAction = { type: 'serverReturnedRelatedEventData', payload };
      store.dispatch(action);
    });
    it('should compile stats reflecting a count of 2 for dns', () => {
      const actualStats = relatedEventStats(store.getState());
      const statsForFakeEvent = actualStats.get(mockBaseEvent)! as RelatedEventDataEntryWithStats;
      expect(statsForFakeEvent.stats).toEqual({ dns: 2 });
    });
  });
});
