/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

export function createMockLegacyEvents(count: number, category: string, eventType: string) {
  const events = [];

  for (let i = 0; i < count; i++) {
    events.push({
      _index: 'index',
      _type: 'type',
      _id: String(getRandomInt(1000)),
      _score: 1,
      _source: {
        '@timestamp': new Date(),
        endgame: {
          event_type_full: category,
          event_subtype_full: eventType,
          unique_pid: getRandomInt(10000),
          unique_ppid: getRandomInt(10000),
          serial_event_id: 5,
        },
        agent: {
          id: 'awesome-id',
        },
      },
    });
  }
  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      max_score: 0,
      hits: events,
    },
    total: 5,
    aggregations: {
      total: {
        value: count,
      },
    },
  };
}

export function createMockEvents(count: number, category: string, eventType: string) {
  const events: any[] = [];
  for (let i = 0; i < count; i++) {
    events.push({
      _index: 'index',
      _type: 'type',
      _id: 'id',
      _score: 1,
      _source: {
        event: {
          category,
          type: eventType,
        },
        endpoint: {
          process: {
            entity_id: getRandomInt(10000),
            parent: {
              entity_id: getRandomInt(10000),
            },
          },
        },
        agent: {
          id: 'awesome-id',
        },
      },
    });
  }
  return {
    took: 1,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      max_score: 0,
      hits: events,
    },
    aggregations: {
      total: {
        value: count,
      },
    },
  };
}
