/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { DataAction } from './action';
import { dataReducer } from './reducer';
import { DataState, ProcessEvent } from '../../types';
import { graphableProcesses, processNodePositionsAndEdgeLineSegments } from './selectors';
import { mockProcessEvent } from '../../models/process_event_test_helpers';

describe('resolver graph layout', () => {
  let processA: ProcessEvent;
  let processB: ProcessEvent;
  let processC: ProcessEvent;
  let processD: ProcessEvent;
  let processE: ProcessEvent;
  let processF: ProcessEvent;
  let processG: ProcessEvent;
  let processH: ProcessEvent;
  let processI: ProcessEvent;
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
      data_buffer: {
        process_name: '',
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 0,
      },
    });
    processB = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'already_running',
        node_id: 1,
        source_id: 0,
      },
    });
    processC = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 2,
        source_id: 0,
      },
    });
    processD = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 3,
        source_id: 1,
      },
    });
    processE = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 4,
        source_id: 1,
      },
    });
    processF = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 5,
        source_id: 2,
      },
    });
    processG = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 6,
        source_id: 2,
      },
    });
    processH = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 7,
        source_id: 6,
      },
    });
    processI = mockProcessEvent({
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'termination_event',
        node_id: 8,
        source_id: 0,
      },
    });
    store = createStore(dataReducer, undefined);
  });
  describe('when rendering no nodes', () => {
    beforeEach(() => {
      const payload = {
        data: {
          result: {
            search_results: [],
          },
        },
      };
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
      const payload = {
        data: {
          result: {
            search_results: [processA],
          },
        },
      };
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
      const payload = {
        data: {
          result: {
            search_results: [processA, processB],
          },
        },
      };
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
      const payload = {
        data: {
          result: {
            search_results: [
              processA,
              processB,
              processC,
              processD,
              processE,
              processF,
              processG,
              processH,
              processI,
            ],
          },
        },
      };
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
