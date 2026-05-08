/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, omit, chunk, isEmpty } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import moment from 'moment';
import type { IEvent } from '@kbn/event-log-plugin/server';
import type { IValidatedEvent } from '@kbn/event-log-plugin/server/types';
import type { FtrProviderContext } from '../../ftr_provider_context';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Minimal mapping shared by the two legacy event-log index fixtures below.
// Using dynamic: 'false' (same as the original archives) so only the fields
// we explicitly declare are indexed, which is sufficient for the queries
// made by the Event Log public API.
const EVENT_LOG_INDEX_MAPPINGS = {
  dynamic: 'false' as const,
  properties: {
    '@timestamp': { type: 'date' as const },
    message: { type: 'keyword' as const },
    ecs: { properties: { version: { type: 'keyword' as const } } },
    event: {
      properties: {
        action: { type: 'keyword' as const },
        duration: { type: 'long' as const },
        end: { type: 'date' as const },
        provider: { type: 'keyword' as const },
        start: { type: 'date' as const },
      },
    },
    kibana: {
      properties: {
        saved_objects: {
          properties: {
            id: { type: 'keyword' as const },
            rel: { type: 'keyword' as const },
            type: { type: 'keyword' as const },
          },
        },
        server_uuid: { type: 'keyword' as const },
        version: { type: 'keyword' as const },
      },
    },
  },
};

const SERVER_UUID = '5b2de169-2785-441b-ae8c-186a1936b17d';

// Documents seeded for the Index Lifecycle test — 3 events per legacy index.
const MULTI_INDEX_DOCS: Array<{ index: string; id: string; doc: object }> = [
  {
    index: '.kibana-event-log-7.9.0-000001',
    id: 'XKbLb3UBt6Z_MVvSSPbe',
    doc: {
      '@timestamp': '2020-10-28T15:19:54.841Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:54.841Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:54.841Z' },
      kibana: { saved_objects: [{ id: '421f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID },
      message: 'test 2020-10-28T15:19:53.825Z',
    },
  },
  {
    index: '.kibana-event-log-7.9.0-000001',
    id: 'XabLb3UBt6Z_MVvSSfYD',
    doc: {
      '@timestamp': '2020-10-28T15:19:54.879Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:54.879Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:54.879Z' },
      kibana: { saved_objects: [{ id: '421f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID },
      message: 'test 2020-10-28T15:19:54.849Z',
    },
  },
  {
    index: '.kibana-event-log-7.9.0-000001',
    id: 'XqbLb3UBt6Z_MVvSSfYe',
    doc: {
      '@timestamp': '2020-10-28T15:19:54.905Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:54.905Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:54.905Z' },
      kibana: { saved_objects: [{ id: '421f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID },
      message: 'test 2020-10-28T15:19:54.881Z',
    },
  },
  {
    index: '.kibana-event-log-8.0.0-000001',
    id: 'X6bLb3UBt6Z_MVvSTfYk',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.933Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.933Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.933Z' },
      kibana: { saved_objects: [{ id: '421f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '8.0.0' },
      message: 'test 2020-10-28T15:19:55.913Z',
    },
  },
  {
    index: '.kibana-event-log-8.0.0-000001',
    id: 'YKbLb3UBt6Z_MVvSTfY8',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.957Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.957Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.957Z' },
      kibana: { saved_objects: [{ id: '421f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '8.0.0' },
      message: 'test 2020-10-28T15:19:55.938Z',
    },
  },
  {
    index: '.kibana-event-log-8.0.0-000001',
    id: 'YabLb3UBt6Z_MVvSTfZc',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.991Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.991Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.991Z' },
      kibana: { saved_objects: [{ id: '421f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '8.0.0' },
      message: 'test 2020-10-28T15:19:55.962Z',
    },
  },
];

// Documents seeded for the Legacy Ids test — 5 events sharing the 8.0.0 index,
// mixing a "current" id (621f...) and a "legacy" id (521f...).
const LEGACY_IDS_DOCS: Array<{ id: string; doc: object }> = [
  {
    id: 'X6bLb3UBt6Z_MVvSTfYk',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.933Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.933Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.933Z' },
      kibana: { saved_objects: [{ id: '621f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '8.0.0' },
      message: 'test 2020-10-28T15:19:55.913Z',
    },
  },
  {
    id: 'X6bLb3UBt6Z_MVvSTfYk0000',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.933Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test legacy', duration: 0, end: '2020-10-28T15:19:55.933Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.933Z' },
      kibana: { saved_objects: [{ id: '521f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '7.14.0' },
      message: 'test legacy 2020-10-28T15:19:55.913Z',
    },
  },
  {
    id: 'YKbLb3UBt6Z_MVvSTfY8',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.957Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.957Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.957Z' },
      kibana: { saved_objects: [{ id: '621f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '8.0.0' },
      message: 'test 2020-10-28T15:19:55.938Z',
    },
  },
  {
    id: 'YabLb3UBt6Z_MVvSTfZc0000',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.991Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.991Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.991Z' },
      kibana: { saved_objects: [{ id: '521f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '7.0.0' },
      message: 'test legacy 2020-10-28T15:19:55.962Z',
    },
  },
  {
    id: 'YabLb3UBt6Z_MVvSTfZc',
    doc: {
      '@timestamp': '2020-10-28T15:19:55.991Z',
      ecs: { version: '1.5.0' },
      event: { action: 'test', duration: 0, end: '2020-10-28T15:19:55.991Z', provider: 'event_log_fixture', start: '2020-10-28T15:19:55.991Z' },
      kibana: { saved_objects: [{ id: '621f2511-5cd1-44fd-95df-e0df83e354d5', rel: 'primary', type: 'event_log_test' }], server_uuid: SERVER_UUID, version: '8.0.0' },
      message: 'test 2020-10-28T15:19:55.962Z',
    },
  },
];

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');
  const spacesService = getService('spaces');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');

  describe('Event Log public API', () => {
    before(async () => {
      await spacesService.create({
        id: 'namespace-a',
        name: 'Space A',
        disabledFeatures: [],
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    for (const namespace of [undefined, 'namespace-a']) {
      const namespaceName = namespace === undefined ? 'default' : namespace;

      describe(`namespace: ${namespaceName}`, () => {
        it('should allow querying for events by Saved Object', async () => {
          const id = uuidv4();

          const expectedEvents = [fakeEvent(namespace, id), fakeEvent(namespace, id)];

          await logTestEvent(namespace, id, expectedEvents[0]);
          await logTestEvent(namespace, id, expectedEvents[1]);

          await retry.try(async () => {
            const {
              body: { data, total },
            } = await findEvents(namespace, id, {});

            expect(data.length).to.be(2);
            expect(total).to.be(2);

            assertEventsFromApiMatchCreatedEvents(data, expectedEvents);
          });
        });

        it('should support pagination for events', async () => {
          const id = uuidv4();

          const expectedEvents = await logFakeEvents(namespace, id, 6);

          await retry.try(async () => {
            const {
              body: { data: foundEvents },
            } = await findEvents(namespace, id, {});

            expect(foundEvents.length).to.be(6);
          });

          const [expectedFirstPage, expectedSecondPage] = chunk(expectedEvents, 3);

          const {
            body: { data: firstPage },
          } = await findEvents(namespace, id, { per_page: 3 });

          expect(firstPage.length).to.be(3);
          assertEventsFromApiMatchCreatedEvents(firstPage, expectedFirstPage);

          const {
            body: { data: secondPage },
          } = await findEvents(namespace, id, { per_page: 3, page: 2 });

          expect(secondPage.length).to.be(3);
          assertEventsFromApiMatchCreatedEvents(secondPage, expectedSecondPage);
        });

        it('should support sorting by event end', async () => {
          const id = uuidv4();

          const expectedEvents = await logFakeEvents(namespace, id, 6);

          await retry.try(async () => {
            const {
              body: { data: foundEvents },
            } = await findEvents(namespace, id, {
              sort: [{ sort_field: 'event.end', sort_order: 'desc' }],
            });

            expect(foundEvents.length).to.be(expectedEvents.length);
            assertEventsFromApiMatchCreatedEvents(foundEvents, expectedEvents.reverse());
          });
        });

        it('should support date ranges for events', async () => {
          const id = uuidv4();

          // write a document that shouldn't be found in the inclusive date range search
          const firstEvent = fakeEvent(namespace, id);
          await logTestEvent(namespace, id, firstEvent);

          // wait a second, get the start time for the date range search
          await delay(1000);
          const start = new Date().toISOString();

          // write the documents that we should be found in the date range searches
          const expectedEvents = await logFakeEvents(namespace, id, 6);

          // get the end time for the date range search
          const end = new Date().toISOString();

          // write a document that shouldn't be found in the inclusive date range search
          await delay(1000);
          const lastEvent = fakeEvent(namespace, id);
          await logTestEvent(namespace, id, lastEvent);

          await retry.try(async () => {
            const {
              body: { data: foundEvents, total },
            } = await findEvents(namespace, id, {});

            expect(foundEvents.length).to.be(8);
            expect(total).to.be(8);
          });

          const {
            body: { data: eventsWithinRange },
          } = await findEvents(namespace, id, { start, end });

          expect(eventsWithinRange.length).to.be(expectedEvents.length);
          assertEventsFromApiMatchCreatedEvents(eventsWithinRange, expectedEvents);

          const {
            body: { data: eventsFrom },
          } = await findEvents(namespace, id, { start });

          expect(eventsFrom.length).to.be(expectedEvents.length + 1);
          assertEventsFromApiMatchCreatedEvents(eventsFrom, [...expectedEvents, lastEvent]);

          const {
            body: { data: eventsUntil },
          } = await findEvents(namespace, id, { end });

          expect(eventsUntil.length).to.be(expectedEvents.length + 1);
          assertEventsFromApiMatchCreatedEvents(eventsUntil, [firstEvent, ...expectedEvents]);
        });
      });
    }

    describe(`Index Lifecycle`, () => {
      it('should query across indices matching the Event Log data view', async () => {
        const indices = ['.kibana-event-log-7.9.0-000001', '.kibana-event-log-8.0.0-000001'];
        await es.indices.delete({ index: indices, ignore_unavailable: true });
        for (const index of indices) {
          await es.indices.create({ index, mappings: EVENT_LOG_INDEX_MAPPINGS });
        }
        await es.bulk({
          operations: MULTI_INDEX_DOCS.flatMap(({ index, id, doc }) => [
            { index: { _index: index, _id: id } },
            doc,
          ]),
          refresh: true,
        });

        try {
          const id = `421f2511-5cd1-44fd-95df-e0df83e354d5`;

          const {
            body: { data, total },
          } = await findEventsByIds(undefined, [id], {}, [id]);

          expect(data.length).to.be(6);
          expect(total).to.be(6);

          expect(data.map((foundEvent: IEvent) => foundEvent?.message)).to.eql([
            'test 2020-10-28T15:19:53.825Z',
            'test 2020-10-28T15:19:54.849Z',
            'test 2020-10-28T15:19:54.881Z',
            'test 2020-10-28T15:19:55.913Z',
            'test 2020-10-28T15:19:55.938Z',
            'test 2020-10-28T15:19:55.962Z',
          ]);
        } finally {
          await es.indices.delete({ index: indices, ignore_unavailable: true });
        }
      });
    });

    describe(`Legacy Ids`, () => {
      before(async () => {
        await es.indices.delete({ index: '.kibana-event-log-8.0.0-000001', ignore_unavailable: true });
        await es.indices.create({ index: '.kibana-event-log-8.0.0-000001', mappings: EVENT_LOG_INDEX_MAPPINGS });
        await es.bulk({
          operations: LEGACY_IDS_DOCS.flatMap(({ id, doc }) => [
            { index: { _index: '.kibana-event-log-8.0.0-000001', _id: id } },
            doc,
          ]),
          refresh: true,
        });
      });
      after(async () => {
        await es.indices.delete({ index: '.kibana-event-log-8.0.0-000001', ignore_unavailable: true });
      });
      it('should support search event by ids and legacyIds', async () => {
        const legacyId = `521f2511-5cd1-44fd-95df-e0df83e354d5`;
        const id = `621f2511-5cd1-44fd-95df-e0df83e354d5`;

        const {
          body: { data, total },
        } = await findEventsByIds(undefined, [id], {}, [legacyId]);

        expect(data.length).to.be(5);
        expect(total).to.be(5);

        expect(data.map((foundEvent: IEvent) => foundEvent?.message)).to.eql([
          'test 2020-10-28T15:19:55.913Z',
          'test legacy 2020-10-28T15:19:55.913Z',
          'test 2020-10-28T15:19:55.938Z',
          'test legacy 2020-10-28T15:19:55.962Z',
          'test 2020-10-28T15:19:55.962Z',
        ]);
      });

      it('should search event only by ids if no legacyIds are provided', async () => {
        const id = `621f2511-5cd1-44fd-95df-e0df83e354d5`;

        const {
          body: { data, total },
        } = await findEventsByIds(undefined, [id], {});

        expect(data.length).to.be(3);
        expect(total).to.be(3);

        expect(data.map((foundEvent: IEvent) => foundEvent?.message)).to.eql([
          'test 2020-10-28T15:19:55.913Z',
          'test 2020-10-28T15:19:55.938Z',
          'test 2020-10-28T15:19:55.962Z',
        ]);
      });
    });
  });

  async function findEvents(
    namespace: string | undefined,
    id: string,
    query: Record<string, any> = {}
  ) {
    const urlPrefix = urlPrefixFromNamespace(namespace);
    const url = `${urlPrefix}/_test/event_log/event_log_test/${id}/_find${
      isEmpty(query)
        ? ''
        : `?${Object.entries(query)
            .map(([key, val]) =>
              typeof val === 'object' ? `${key}=${JSON.stringify(val)}` : `${key}=${val}`
            )
            .join('&')}`
    }`;
    await delay(1000); // wait for buffer to be written
    log.debug(`Finding Events for Saved Object with ${url}`);
    return await supertest.get(url).set('kbn-xsrf', 'foo').expect(200);
  }

  async function findEventsByIds(
    namespace: string | undefined,
    ids: string[],
    query: Record<string, any> = {},
    legacyIds: string[] = []
  ) {
    const urlPrefix = urlPrefixFromNamespace(namespace);
    const url = `${urlPrefix}/_test/event_log/event_log_test/_find${
      isEmpty(query)
        ? ''
        : `?${Object.entries(query)
            .map(([key, val]) => `${key}=${val}`)
            .join('&')}`
    }`;
    await delay(1000); // wait for buffer to be written
    log.debug(`Finding Events for Saved Object with ${url}`);
    return await supertest
      .post(url)
      .set('kbn-xsrf', 'foo')
      .send({
        ids,
        legacyIds,
      })
      .expect(200);
  }

  function assertEventsFromApiMatchCreatedEvents(
    foundEvents: IValidatedEvent[],
    expectedEvents: IEvent[]
  ) {
    try {
      foundEvents.forEach((foundEvent: IValidatedEvent, index: number) => {
        expect(omit(foundEvent!.event ?? {}, 'start', 'end', 'duration')).to.eql(
          expectedEvents[index]!.event
        );
        expect(omit(foundEvent!.kibana ?? {}, 'server_uuid', 'version')).to.eql(
          expectedEvents[index]!.kibana
        );
        expect(foundEvent!.message).to.eql(expectedEvents[index]!.message);
      });
    } catch (ex) {
      log.debug(`failed to match ${JSON.stringify({ foundEvents, expectedEvents })}`);
      throw ex;
    }
  }

  async function logTestEvent(namespace: string | undefined, id: string, event: IEvent) {
    const urlPrefix = urlPrefixFromNamespace(namespace);
    const url = `${urlPrefix}/api/log_event_fixture/${id}/_log`;
    log.debug(`Logging Event for Saved Object with ${url} - ${JSON.stringify(event)}`);
    return await supertest.post(url).set('kbn-xsrf', 'foo').send(event).expect(200);
  }

  function fakeEvent(
    namespace: string | undefined,
    id: string,
    overrides: Partial<IEvent> = {}
  ): IEvent {
    const savedObject: any = {
      rel: 'primary',
      type: 'event_log_test',
      id,
    };
    if (namespace !== undefined) {
      savedObject.namespace = namespace;
    }

    return merge(
      {
        event: {
          provider: 'event_log_fixture',
          action: 'test',
        },
        kibana: {
          saved_objects: [savedObject],
        },
        message: `test ${moment().toISOString()}`,
      },
      overrides
    );
  }

  async function logFakeEvents(
    namespace: string | undefined,
    savedObjectId: string,
    eventsToLog: number
  ): Promise<IEvent[]> {
    const expectedEvents: IEvent[] = [];
    for (let index = 0; index < eventsToLog; index++) {
      const event = fakeEvent(namespace, savedObjectId);
      await logTestEvent(namespace, savedObjectId, event);
      expectedEvents.push(event);
    }
    return expectedEvents;
  }
}

function urlPrefixFromNamespace(namespace: string | undefined): string {
  if (namespace === undefined) return '';
  return `/s/${namespace}`;
}
