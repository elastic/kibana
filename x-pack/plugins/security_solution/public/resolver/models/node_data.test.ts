/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointDocGenerator } from '../../../common/endpoint/generate_data';
import { NodeData } from '../types';
import {
  setErrorNodes,
  setReloadedNodes,
  setRequestedNodes,
  updateWithReceivedNodes,
} from './node_data';

describe('node data model', () => {
  const generator = new EndpointDocGenerator('resolver');
  describe('creates a copy of the map', () => {
    const original: Map<string, NodeData> = new Map();

    it('creates a copy when using setRequestedNodes', () => {
      expect(setRequestedNodes(original, new Set(), 0) === original).toBeFalsy();
    });

    it('creates a copy when using setErrorNodes', () => {
      expect(setErrorNodes(original, new Set(), 0) === original).toBeFalsy();
    });

    it('creates a copy when using setReloadedNodes', () => {
      expect(setReloadedNodes(original, '5') === original).toBeFalsy();
    });

    it('creates a copy when using updateWithReceivedNodes', () => {
      expect(
        updateWithReceivedNodes({
          storedNodeInfo: original,
          receivedEvents: [],
          requestedNodes: new Set(),
          numberOfRequestedEvents: 1,
          dataRequestID: 0,
        }) === original
      ).toBeFalsy();
    });
  });

  it('overwrites the existing entries and creates new ones when calling setRequestedNodes', () => {
    const state = new Map<string, NodeData>([
      [
        '1',
        {
          events: [generator.generateEvent({ eventType: ['start'] })],
          status: 'running',
          dataRequestID: 0,
        },
      ],
    ]);

    expect(setRequestedNodes(state, new Set(['1', '2']), 0)).toEqual(
      new Map<string, NodeData>([
        ['1', { events: [], status: 'loading', dataRequestID: 0 }],
        ['2', { events: [], status: 'loading', dataRequestID: 0 }],
      ])
    );
  });

  it('overwrites the existing entries and creates new ones when calling setErrorNodes', () => {
    const state = new Map<string, NodeData>([
      [
        '1',
        {
          events: [generator.generateEvent({ eventType: ['start'] })],
          status: 'running',
          dataRequestID: 0,
        },
      ],
    ]);

    expect(setErrorNodes(state, new Set(['1', '2']), 0)).toEqual(
      new Map<string, NodeData>([
        ['1', { events: [], status: 'error', dataRequestID: 0 }],
        ['2', { events: [], status: 'error', dataRequestID: 0 }],
      ])
    );
  });

  describe('setReloadedNodes', () => {
    it('removes the id from the map', () => {
      const state = new Map<string, NodeData>([
        ['1', { events: [], status: 'error', dataRequestID: 0 }],
      ]);
      expect(setReloadedNodes(state, '1')).toEqual(new Map());
    });
  });

  describe('updateWithReceivedNodes', () => {
    const node1Events = [generator.generateEvent({ entityID: '1', eventType: ['start'] })];
    const node2Events = [generator.generateEvent({ entityID: '2', eventType: ['start'] })];
    const state = new Map<string, NodeData>([
      ['1', { events: node1Events, status: 'error', dataRequestID: 0 }],
      ['2', { events: node2Events, status: 'error', dataRequestID: 0 }],
    ]);
    describe('reachedLimit is false', () => {
      it('overwrites entries with the received data', () => {
        const genNodeEvent = generator.generateEvent({ entityID: '1', eventType: ['start'] });

        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [genNodeEvent],
            requestedNodes: new Set(['1']),
            // a number greater than the amount received so the reached limit flag with be false
            numberOfRequestedEvents: 10,
            dataRequestID: 0,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: [genNodeEvent], status: 'running', dataRequestID: 0 }],
            ['2', { events: node2Events, status: 'error', dataRequestID: 0 }],
          ])
        );
      });

      it('initializes entries from the requested nodes even if no data was received', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [],
            requestedNodes: new Set(['1', '2']),
            numberOfRequestedEvents: 1,
            dataRequestID: 0,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: [], status: 'running', dataRequestID: 0 }],
            ['2', { events: [], status: 'running', dataRequestID: 0 }],
          ])
        );
      });
    });

    describe('reachedLimit is true', () => {
      it('deletes entries in the map that we did not receive data for', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [],
            requestedNodes: new Set(['1']),
            numberOfRequestedEvents: 0,
            dataRequestID: 0,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['2', { events: node2Events, status: 'error', dataRequestID: 0 }],
          ])
        );
      });

      it('attempts to remove entries from the map even if they do not exist', () => {
        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [],
            requestedNodes: new Set(['10']),
            numberOfRequestedEvents: 0,
            dataRequestID: 0,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: node1Events, status: 'error', dataRequestID: 0 }],
            ['2', { events: node2Events, status: 'error', dataRequestID: 0 }],
          ])
        );
      });

      it('does not delete the entry if it exists in the received node data from the server', () => {
        const genNodeEvent = generator.generateEvent({ entityID: '1', eventType: ['start'] });

        expect(
          updateWithReceivedNodes({
            storedNodeInfo: state,
            receivedEvents: [genNodeEvent],
            requestedNodes: new Set(['1']),
            numberOfRequestedEvents: 1,
            dataRequestID: 0,
          })
        ).toEqual(
          new Map<string, NodeData>([
            ['1', { events: [genNodeEvent], status: 'running', dataRequestID: 0 }],
            ['2', { events: node2Events, status: 'error', dataRequestID: 0 }],
          ])
        );
      });
    });
  });
});
