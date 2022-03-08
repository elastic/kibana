/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  processAndReturnEvent,
  getEventsByIdMap,
  getServicePathsFromTraceIds,
} from './get_service_paths_from_trace_ids';
import type { Context, EventSpan } from './get_service_paths_from_trace_ids';
import { ServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';
import { Span } from '../../../typings/es_schemas/ui/span';

/*
 * this events creates this service maps
 * bar  ->  foo  ->  python
 *  ^-------baz--------^
 */
const esHits = [
  {
    _source: {
      service: { name: 'foo', environment: 'prod' },
      agent: { name: 'nodejs' },
      processor: { event: 'span' },
      parent: { id: 'A' },
      span: {
        id: 'B',
        type: 'external',
        subtype: 'http',
        destination: { service: { resource: 'python' } },
      },
    },
  },
  {
    _source: {
      parent: { id: 'C' },
      service: { name: 'foo', environment: 'prod' },
      agent: { name: 'nodejs' },
      transaction: { id: 'A' },
      processor: { event: 'transaction' },
    },
  },
  {
    _source: {
      parent: { id: 'D' },
      service: { name: 'bar', environment: 'prod' },
      agent: { name: 'java' },
      transaction: { id: 'C' },
      processor: { event: 'transaction' },
    },
  },
  {
    _source: {
      service: { name: 'baz', environment: 'prod' },
      agent: { name: 'ruby' },
      transaction: { id: 'D' },
      processor: { event: 'transaction' },
    },
  },
  {
    _source: {
      service: { name: 'baz', environment: 'prod' },
      agent: { name: 'ruby' },
      processor: { event: 'span' },
      parent: { id: 'D' },
      span: {
        id: 'D2',
        type: 'external',
        subtype: 'http',
        destination: { service: { resource: 'python' } },
      },
    },
  },
] as unknown as ServicePathsFromTraceIds;

describe('get_service_paths_from_trace_ids', () => {
  describe('getEventsByIdMap', () => {
    it('returns empty when processor event is not available', () => {
      const servicePathsFromTraceIds = [
        { _source: {} },
      ] as unknown as ServicePathsFromTraceIds;
      expect(getEventsByIdMap(servicePathsFromTraceIds)).toEqual({});
    });
    it('returns empty when not Span or Transaction type', () => {
      const servicePathsFromTraceIds = [
        { _source: { processor: { event: 'metric' } } },
        { _source: { processor: { event: 'error' } } },
      ] as unknown as ServicePathsFromTraceIds;
      expect(getEventsByIdMap(servicePathsFromTraceIds)).toEqual({});
    });
    it('returns map fo events', () => {
      const servicePathsFromTraceIds = [
        {
          _source: {
            processor: { event: 'transaction' },
            transaction: { id: 'foo' },
          },
        },
        {
          _source: {
            processor: { event: 'span' },
            span: { id: 'bar' },
          },
        },
        {
          _source: {
            processor: { event: 'transaction' },
            transaction: { id: 'baz' },
          },
        },
        {
          _source: {
            processor: { event: 'span' },
            span: { id: 'qux' },
          },
        },
      ] as unknown as ServicePathsFromTraceIds;
      expect(getEventsByIdMap(servicePathsFromTraceIds)).toEqual({
        foo: {
          docType: 'transaction',
          doc: {
            processor: { event: 'transaction' },
            transaction: { id: 'foo' },
          },
        },
        bar: {
          docType: 'span',
          doc: { processor: { event: 'span' }, span: { id: 'bar' } },
        },
        baz: {
          docType: 'transaction',
          doc: {
            processor: { event: 'transaction' },
            transaction: { id: 'baz' },
          },
        },
        qux: {
          docType: 'span',
          doc: {
            processor: { event: 'span' },
            span: { id: 'qux' },
          },
        },
      });
    });
  });

  describe('processAndReturnEvent', () => {
    it('returns events already processed', () => {
      const processedEvents = {
        foo: { docType: 'span', doc: {} as Span },
      };
      expect(
        processAndReturnEvent({
          context: {
            eventsById: {},
            processedEvents,
            paths: {},
            externalToServiceMap: {},
            locationsToRemove: {},
          } as Context,
          id: 'foo',
        })
      ).toEqual({ docType: 'span', doc: {} as Span });
    });

    it('returns null when event is not found', () => {
      const eventsById = {
        foo: { docType: 'span', doc: {} as Span },
      };
      expect(
        processAndReturnEvent({
          context: {
            eventsById,
            processedEvents: {},
            paths: {},
            externalToServiceMap: {},
            locationsToRemove: {},
          } as Context,
          id: 'bar',
        })
      ).toEqual(null);
    });

    it('returns single event when parent is not available', () => {
      const eventsById = {
        foo: {
          docType: 'span',
          doc: {
            service: { name: 'foo service.name', environment: 'foo env' },
            agent: { name: 'nodejs' },
            processor: { event: 'span' },
            span: {
              id: 'foo',
              type: 'external',
              subtype: 'http',
              destination: { service: { resource: 'bar' } },
            },
          },
        } as EventSpan,
      };
      const context: Context = {
        eventsById,
        processedEvents: {},
        paths: {},
        externalToServiceMap: {},
        locationsToRemove: {},
      };

      const expectedEvent = {
        docType: 'span',
        doc: {
          service: { name: 'foo service.name', environment: 'foo env' },
          agent: { name: 'nodejs' },
          processor: { event: 'span' },
          span: {
            id: 'foo',
            type: 'external',
            subtype: 'http',
            destination: { service: { resource: 'bar' } },
          },
        },
        path: [
          {
            'agent.name': 'nodejs',
            'service.environment': 'foo env',
            'service.name': 'foo service.name',
          },
        ],
      };

      expect(processAndReturnEvent({ context, id: 'foo' })).toEqual(
        expectedEvent
      );
      expect(context.processedEvents).toEqual({ foo: expectedEvent });
      expect(Object.values(context.paths)).toEqual([
        [
          {
            'service.name': 'foo service.name',
            'service.environment': 'foo env',
            'agent.name': 'nodejs',
          },
          {
            'span.destination.service.resource': 'bar',
            'span.type': 'external',
            'span.subtype': 'http',
          },
        ],
      ]);
    });

    it('returns multiple events', () => {
      const eventsById = getEventsByIdMap(esHits);
      const context: Context = {
        eventsById,
        processedEvents: {},
        paths: {},
        externalToServiceMap: {},
        locationsToRemove: {},
      };
      processAndReturnEvent({ context, id: 'B' });
      expect(Object.keys(context.processedEvents)).toEqual([
        'D',
        'C',
        'A',
        'B',
      ]);
      expect(Object.values(context.paths)).toEqual([
        [
          {
            'service.name': 'baz',
            'service.environment': 'prod',
            'agent.name': 'ruby',
          },
          {
            'service.name': 'bar',
            'service.environment': 'prod',
            'agent.name': 'java',
          },
          {
            'service.name': 'foo',
            'service.environment': 'prod',
            'agent.name': 'nodejs',
          },
          {
            'span.destination.service.resource': 'python',
            'span.type': 'external',
            'span.subtype': 'http',
          },
        ],
      ]);
      expect(Object.values(context.locationsToRemove)).toEqual([
        [
          {
            'service.name': 'baz',
            'service.environment': 'prod',
            'agent.name': 'ruby',
          },
        ],
        [
          {
            'service.name': 'baz',
            'service.environment': 'prod',
            'agent.name': 'ruby',
          },
          {
            'service.name': 'bar',
            'service.environment': 'prod',
            'agent.name': 'java',
          },
        ],
        [
          {
            'service.name': 'baz',
            'service.environment': 'prod',
            'agent.name': 'ruby',
          },
          {
            'service.name': 'bar',
            'service.environment': 'prod',
            'agent.name': 'java',
          },
          {
            'service.name': 'foo',
            'service.environment': 'prod',
            'agent.name': 'nodejs',
          },
        ],
      ]);
    });
  });

  describe('getServicePathsFromTraceIds', () => {
    it('returns paths', async () => {
      const response = await getServicePathsFromTraceIds({
        servicePathsFromTraceIds: esHits,
      });

      expect(response.paths).toEqual([
        [
          {
            'service.name': 'baz',
            'service.environment': 'prod',
            'agent.name': 'ruby',
          },
          {
            'service.name': 'bar',
            'service.environment': 'prod',
            'agent.name': 'java',
          },
          {
            'service.name': 'foo',
            'service.environment': 'prod',
            'agent.name': 'nodejs',
          },
          {
            'span.destination.service.resource': 'python',
            'span.type': 'external',
            'span.subtype': 'http',
          },
        ],
        [
          {
            'service.name': 'baz',
            'service.environment': 'prod',
            'agent.name': 'ruby',
          },
          {
            'span.destination.service.resource': 'python',
            'span.type': 'external',
            'span.subtype': 'http',
          },
        ],
      ]);

      expect(response.discoveredServices).toEqual([]);
    });
  });
});
