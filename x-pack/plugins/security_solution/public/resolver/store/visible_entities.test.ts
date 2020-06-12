/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { ResolverAction } from './actions';
import { resolverReducer } from './reducer';
import { ResolverState } from '../types';
import { LegacyEndpointEvent, ResolverEvent } from '../../../common/endpoint/types';
import { visibleProcessNodePositionsAndEdgeLineSegments } from './selectors';
import { mockProcessEvent } from '../models/process_event_test_helpers';

describe('resolver visible entities', () => {
  let processA: LegacyEndpointEvent;
  let processB: LegacyEndpointEvent;
  let processC: LegacyEndpointEvent;
  let processD: LegacyEndpointEvent;
  let processE: LegacyEndpointEvent;
  let processF: LegacyEndpointEvent;
  let processG: LegacyEndpointEvent;
  let processH: LegacyEndpointEvent;
  let processI: LegacyEndpointEvent;
  let store: Store<ResolverState, ResolverAction>;

  beforeEach(() => {
    /*
     *          A
     *          |
     *          B
     *          |
     *          C
     *          |
     *          D etc
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
    processD = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 2,
        unique_ppid: 1,
      },
    });
    processE = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 3,
        unique_ppid: 2,
      },
    });
    processF = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 4,
        unique_ppid: 3,
      },
    });
    processG = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 5,
        unique_ppid: 4,
      },
    });
    processH = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 6,
        unique_ppid: 5,
      },
    });
    processI = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'termination_event',
        unique_pid: 7,
        unique_ppid: 6,
      },
    });
    store = createStore(resolverReducer, undefined);
  });
  describe('when rendering a large tree with a small viewport', () => {
    beforeEach(() => {
      const payload: ResolverEvent[] = [];
      const action: ResolverAction = { type: 'serverReturnedResolverData', payload };
      const cameraAction: ResolverAction = { type: 'userSetRasterSize', payload: [300, 200] };
      store.dispatch(action);
      store.dispatch(cameraAction);
    });
    it('the visibleProcessNodePositions list should only include 2 nodes', () => {
      const { visibleProcessNodePositions } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      );
      expect(visibleProcessNodePositions.length).toEqual(2);
    });
    it('the visibleEdgeLineSegments list should only include 2 lines', () => {
      const { visibleEdgeLineSegments } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      );
      expect(visibleEdgeLineSegments.length).toEqual(2);
    });
  });
  describe('when rendering a large tree with a large viewport', () => {
    beforeEach(() => {
      const payload: ResolverEvent[] = [];
      const action: ResolverAction = { type: 'serverReturnedResolverData', payload };
      const cameraAction: ResolverAction = { type: 'userSetRasterSize', payload: [1000, 1000] };
      store.dispatch(action);
      store.dispatch(cameraAction);
    });
    it('the visibleProcessNodePositions list should include all lines', () => {
      const { visibleProcessNodePositions } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      );
      expect(visibleProcessNodePositions.length).toEqual(8);
    });
    it('the visibleEdgeLineSegments list include all lines', () => {
      const { visibleEdgeLineSegments } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      );
      expect(visibleEdgeLineSegments.length).toEqual(7);
    });
  });
});
