/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore, AnyAction } from 'redux';
import { DataAction } from './action';
import { dataReducer } from './reducer';
import { DataState, Vector2 } from '../../types';
import {
  graphableProcesses,
  widthOfProcessSubtrees,
  distanceBetweenNodes,
  processNodePositionsAndEdgeLineSegments,
} from './selectors';

describe('resolver graph layout', () => {
  let store: Store<DataState, AnyAction>;

  beforeEach(() => {
    store = createStore(dataReducer, undefined);
  });
  describe('resolver data is received', () => {
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
    const processA = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 0,
      },
    };
    const processB = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'already_running',
        node_id: 1,
        source_id: 0,
      },
    };
    const processC = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 2,
        source_id: 0,
      },
    };
    const processD = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 3,
        source_id: 1,
      },
    };
    const processE = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 4,
        source_id: 1,
      },
    };
    const processF = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 5,
        source_id: 2,
      },
    };
    const processG = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 6,
        source_id: 2,
      },
    };
    const processH = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        node_id: 7,
        source_id: 6,
      },
    };
    const processI = {
      data_buffer: {
        event_type_full: 'process_event',
        event_subtype_full: 'termination_event',
        node_id: 8,
        source_id: 0,
      },
    };
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
    it('the width of process subtress is calculated correctly', () => {
      const expected = new Map([
        [processA, 3 * distanceBetweenNodes],
        [processB, 1 * distanceBetweenNodes],
        [processC, 1 * distanceBetweenNodes],
        [processD, 0 * distanceBetweenNodes],
        [processE, 0 * distanceBetweenNodes],
        [processF, 0 * distanceBetweenNodes],
        [processG, 0 * distanceBetweenNodes],
        [processH, 0 * distanceBetweenNodes],
      ]);
      const actual = widthOfProcessSubtrees(store.getState());
      expect(actual).toEqual(expected);
    });
    it('it renders the nodes at the right positions', () => {
      const expected = new Map([
        [processA, [0, 100]],
        [processB, [-100, 0]],
        [processC, [100, 0]],
        [processD, [-150, -100]],
        [processE, [-50, -100]],
        [processF, [50, -100]],
        [processG, [150, -100]],
        [processH, [150, -200]],
      ]);
      const actual = processNodePositionsAndEdgeLineSegments(store.getState()).processNodePositions;
      expect(actual).toEqual(expected);
    });
    it('it renders edges at the right positions', () => {
      expect(false).toEqual(true);
    });
  });
});
