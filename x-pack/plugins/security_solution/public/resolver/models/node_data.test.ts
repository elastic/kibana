/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SafeResolverEvent } from '../../../common/endpoint/types';
import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import { IDToNodeInfo } from '../types';
import {
  idsNotInBase,
  setErrorNodes,
  setRequestedNodes,
  updateWithReceivedNodes,
} from './node_data';

describe('node data model', () => {
  const generator = new EndpointDocGenerator('resolver');
  describe('creates a copy of the map', () => {
    const original: IDToNodeInfo = new Map();

    it('creates a copy when using setRequestedNodes', () => {
      expect(setRequestedNodes(original, new Set()) === original).toBeFalsy();
    });

    it('creates a copy when using setErrorNodes', () => {
      expect(setErrorNodes(original, new Set()) === original).toBeFalsy();
    });

    it('creates a copy when using updateWithReceivedNodes', () => {
      expect(
        updateWithReceivedNodes({
          storedNodeInfo: original,
          receivedNodes: new Map(),
          requestedNodes: new Set(),
          reachedLimit: false,
        }) === original
      ).toBeFalsy();
    });
  });

  it('overwrites the existing entries and creates new ones when calling setRequestedNodes', () => {
    const state: IDToNodeInfo = new Map([
      ['1', { events: [generator.generateEvent()], status: 'received' }],
    ]);

    expect(setRequestedNodes(state, new Set(['1', '2']))).toEqual(
      new Map([
        ['1', { events: [], status: 'requested' }],
        ['2', { events: [], status: 'requested' }],
      ])
    );
  });

  it('overwrites the existing entries and creates new ones when calling setErrorNodes', () => {
    const state: IDToNodeInfo = new Map([
      ['1', { events: [generator.generateEvent()], status: 'received' }],
    ]);

    expect(setErrorNodes(state, new Set(['1', '2']))).toEqual(
      new Map([
        ['1', { events: [], status: 'error' }],
        ['2', { events: [], status: 'error' }],
      ])
    );
  });

  describe('idsNotInBase', () => {
    it('marks all ids as not in the base state when the state is undefined', () => {
      expect(idsNotInBase(undefined, new Set(['1', '2']))).toEqual(new Set(['1', '2']));
    });

    it('only includes ids that are not in the base state', () => {
      const state: IDToNodeInfo = new Map([
        ['1', { events: [generator.generateEvent()], status: 'error' }],
      ]);
      expect(idsNotInBase(state, new Set(['1', '2', '3']))).toEqual(new Set(['2', '3']));
    });
  });

  describe('updateWithReceivedNodes', () => {
    const node1Events = [generator.generateEvent({ entityID: '1' })];
    const node2Events = [generator.generateEvent({ entityID: '2' })];
    const state: IDToNodeInfo = new Map([
      ['1', { events: node1Events, status: 'error' }],
      ['2', { events: node2Events, status: 'error' }],
    ]);
    describe('reachedLimit is false', () => {
      it('overwrites entries with the received data', () => {
        const genNodeEvent = generator.generateEvent({ entityID: '3' });
        const received = new Map<string, SafeResolverEvent[]>([['1', [genNodeEvent]]]);
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedNodes: received,
            requestedNodes: new Set(['1']),
            reachedLimit: false,
          })
        ).toEqual(
          new Map([
            ['1', { events: [genNodeEvent], status: 'received' }],
            ['2', { events: node2Events, status: 'error' }],
          ])
        );
      });

      it('initializes entries from the requested nodes even if no data was received', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedNodes: new Map(),
            requestedNodes: new Set(['1', '2']),
            reachedLimit: false,
          })
        ).toEqual(
          new Map([
            ['1', { events: [], status: 'received' }],
            ['2', { events: [], status: 'received' }],
          ])
        );
      });
    });

    describe('reachedLimit is true', () => {
      it('deletes entries in the map that we did not receive data for', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedNodes: new Map(),
            requestedNodes: new Set(['1']),
            reachedLimit: true,
          })
        ).toEqual(new Map([['2', { events: node2Events, status: 'error' }]]));
      });

      it('attempts to remove entries from the map even if they do not exist', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedNodes: new Map(),
            requestedNodes: new Set(['10']),
            reachedLimit: true,
          })
        ).toEqual(
          new Map([
            ['1', { events: node1Events, status: 'error' }],
            ['2', { events: node2Events, status: 'error' }],
          ])
        );
      });

      it('does not delete the entry if it exists in the received node data from the server', () => {
        const genNodeEvent = generator.generateEvent({ entityID: '3' });
        const received = new Map<string, SafeResolverEvent[]>([['1', [genNodeEvent]]]);
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedNodes: received,
            requestedNodes: new Set(['1']),
            reachedLimit: true,
          })
        ).toEqual(
          new Map([
            ['1', { events: [genNodeEvent], status: 'received' }],
            ['2', { events: node2Events, status: 'error' }],
          ])
        );
      });
    });
  });
});
