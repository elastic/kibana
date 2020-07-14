/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store, createStore } from 'redux';
import { ResolverAction } from '../actions';
import { resolverReducer } from '../reducer';
import { ResolverState } from '../../types';
import { LegacyEndpointEvent, ResolverEvent } from '../../../../common/endpoint/types';
import { visibleProcessNodePositionsAndEdgeLineSegments } from '../selectors';
import { mockProcessEvent } from '../../models/process_event_test_helpers';
import { mock as mockResolverTree } from '../../models/resolver_tree';

describe('resolver visible entities', () => {
  let processA: LegacyEndpointEvent;
  let processB: LegacyEndpointEvent;
  let processC: LegacyEndpointEvent;
  let processD: LegacyEndpointEvent;
  let processE: LegacyEndpointEvent;
  let processF: LegacyEndpointEvent;
  let processG: LegacyEndpointEvent;
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
    processC = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 2,
        unique_ppid: 1,
      },
    });
    processD = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 3,
        unique_ppid: 2,
      },
    });
    processE = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 4,
        unique_ppid: 3,
      },
    });
    processF = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 5,
        unique_ppid: 4,
      },
    });
    processF = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 6,
        unique_ppid: 5,
      },
    });
    processG = mockProcessEvent({
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: 7,
        unique_ppid: 6,
      },
    });
    store = createStore(resolverReducer, undefined);
  });
  describe('when rendering a large tree with a small viewport', () => {
    beforeEach(() => {
      const events: ResolverEvent[] = [
        processA,
        processB,
        processC,
        processD,
        processE,
        processF,
        processG,
      ];
      const action: ResolverAction = {
        type: 'serverReturnedResolverData',
        payload: { result: mockResolverTree({ events })!, databaseDocumentID: '' },
      };
      const cameraAction: ResolverAction = { type: 'userSetRasterSize', payload: [300, 200] };
      store.dispatch(action);
      store.dispatch(cameraAction);
    });
    it('the visibleProcessNodePositions list should only include 2 nodes', () => {
      const { processNodePositions } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      )(0);
      expect([...processNodePositions.keys()].length).toEqual(2);
    });
    it('the visibleEdgeLineSegments list should only include one edge line', () => {
      const { connectingEdgeLineSegments } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      )(0);
      expect(connectingEdgeLineSegments.length).toEqual(1);
    });
  });
  describe('when rendering a large tree with a large viewport', () => {
    beforeEach(() => {
      const events: ResolverEvent[] = [
        processA,
        processB,
        processC,
        processD,
        processE,
        processF,
        processG,
      ];
      const action: ResolverAction = {
        type: 'serverReturnedResolverData',
        payload: { result: mockResolverTree({ events })!, databaseDocumentID: '' },
      };
      const cameraAction: ResolverAction = { type: 'userSetRasterSize', payload: [2000, 2000] };
      store.dispatch(action);
      store.dispatch(cameraAction);
    });
    it('the visibleProcessNodePositions list should include all process nodes', () => {
      const { processNodePositions } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      )(0);
      expect([...processNodePositions.keys()].length).toEqual(5);
    });
    it('the visibleEdgeLineSegments list include all lines', () => {
      const { connectingEdgeLineSegments } = visibleProcessNodePositionsAndEdgeLineSegments(
        store.getState()
      )(0);
      expect(connectingEdgeLineSegments.length).toEqual(4);
    });
  });
});
