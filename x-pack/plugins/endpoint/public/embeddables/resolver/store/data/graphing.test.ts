/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { DataAction } from './action';
import { dataReducer } from './reducer';
import { DataState } from '../../types';
import { LegacyEndpointEvent, ResolverEvent } from '../../../../../common/types';
import { graphableProcesses, processNodePositionsAndEdgeLineSegments } from './selectors';
import { mockProcessEvent } from '../../models/process_event_test_helpers';

describe('resolver graph layout', () => {
  let processA: LegacyEndpointEvent;
  let processB: LegacyEndpointEvent;
  let processC: LegacyEndpointEvent;
  let processD: LegacyEndpointEvent;
  let processE: LegacyEndpointEvent;
  let processF: LegacyEndpointEvent;
  let processG: LegacyEndpointEvent;
  let processH: LegacyEndpointEvent;
  let processI: LegacyEndpointEvent;
  let store: Store<DataState, DataAction>;

  beforeEach(() => {
    /*
     *          A
     *      ____|____
     *     |         |
     *     B         C
     *  ___|___   ___|___
     * |       | |       |
     * D       E F       G
     *                   |
     *                   H
     *
     */
    processA = mockProcessEvent({
      endgame: {
        process_name: '',
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 0,
      },
    });
    processB = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'already_running',
        unique_pid: 1,
        unique_ppid: 0,
      },
    });
    processC = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 2,
        unique_ppid: 0,
      },
    });
    processD = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 3,
        unique_ppid: 1,
      },
    });
    processE = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 4,
        unique_ppid: 1,
      },
    });
    processF = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 5,
        unique_ppid: 2,
      },
    });
    processG = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 6,
        unique_ppid: 2,
      },
    });
    processH = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 7,
        unique_ppid: 6,
      },
    });
    processI = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'termination_event',
        unique_pid: 8,
        unique_ppid: 0,
      },
    });
    store = createStore(dataReducer, undefined);
  });
  describe('when rendering no nodes', () => {
    beforeEach(() => {
      const payload: ResolverEvent[] = [];
      const action: DataAction = { type: 'serverReturnedResolverData', payload };
      store.dispatch(action);
    });
    it('the graphableProcesses list should only include nothing', () => {
      const actual = graphableProcesses(store.getState());
      expect(actual).toEqual([]);
    });
    it('renders right', () => {
      expect(processNodePositionsAndEdgeLineSegments(store.getState())).toMatchSnapshot();
    });
  });
  describe('when rendering one node', () => {
    beforeEach(() => {
      const payload = [processA];
      const action: DataAction = { type: 'serverReturnedResolverData', payload };
      store.dispatch(action);
    });
    it('the graphableProcesses list should only include nothing', () => {
      const actual = graphableProcesses(store.getState());
      expect(actual).toEqual([processA]);
    });
    it('renders right', () => {
      expect(processNodePositionsAndEdgeLineSegments(store.getState())).toMatchSnapshot();
    });
  });
  describe('when rendering two nodes, one being the parent of the other', () => {
    beforeEach(() => {
      const payload = [processA, processB];
      const action: DataAction = { type: 'serverReturnedResolverData', payload };
      store.dispatch(action);
    });
    it('the graphableProcesses list should only include nothing', () => {
      const actual = graphableProcesses(store.getState());
      expect(actual).toEqual([processA, processB]);
    });
    it('renders right', () => {
      expect(processNodePositionsAndEdgeLineSegments(store.getState())).toMatchSnapshot();
    });
  });
  describe('when rendering two forks, and one fork has an extra long tine', () => {
    beforeEach(() => {
      const payload = [
        processA,
        processB,
        processC,
        processD,
        processE,
        processF,
        processG,
        processH,
        processI,
      ];
      const action: DataAction = { type: 'serverReturnedResolverData', payload };
      store.dispatch(action);
    });
    it("the graphableProcesses list should only include events with 'processCreated' an 'processRan' eventType", () => {
      const actual = graphableProcesses(store.getState());
      expect(actual).toEqual([
        processA,
        processB,
        processC,
        processD,
        processE,
        processF,
        processG,
        processH,
      ]);
    });
    it('renders right', () => {
      expect(processNodePositionsAndEdgeLineSegments(store.getState())).toMatchSnapshot();
    });
  });
});
