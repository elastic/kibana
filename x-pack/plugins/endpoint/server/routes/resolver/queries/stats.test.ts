/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { legacyEventIndexPattern } from './legacy_event_index_pattern';
import { StatsQuery } from './stats';
import { fakeEventIndexPattern } from './children.test';

describe('stats query', () => {
  it('generates the correct legacy queries', () => {
    expect(new StatsQuery(legacyEventIndexPattern, 'awesome-id').build('5')).toStrictEqual({
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'agent.id': 'awesome-id',
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          {
                            term: {
                              'event.kind': 'event',
                            },
                          },
                          {
                            terms: {
                              'endgame.unique_pid': ['5'],
                            },
                          },
                          {
                            bool: {
                              must_not: {
                                term: {
                                  'event.category': 'process',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      bool: {
                        filter: [
                          {
                            term: {
                              'event.kind': 'alert',
                            },
                          },
                          {
                            terms: {
                              'endgame.data.alert_details.acting_process.unique_pid': ['5'],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            filter: {
              term: {
                'event.kind': 'alert',
              },
            },
            aggs: {
              ids: {
                terms: {
                  field: 'endgame.data.alert_details.acting_process.unique_pid',
                },
              },
            },
          },
          events: {
            filter: {
              term: {
                'event.kind': 'event',
              },
            },
            aggs: {
              ids: {
                terms: {
                  field: 'endgame.unique_pid',
                },
              },
            },
          },
        },
      },
      index: legacyEventIndexPattern,
    });
  });

  it('generates the correct non-legacy queries', () => {
    expect(new StatsQuery(fakeEventIndexPattern).build('baz')).toStrictEqual({
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'process.entity_id': ['baz'],
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        filter: [
                          {
                            term: {
                              'event.kind': 'event',
                            },
                          },
                          {
                            bool: {
                              must_not: {
                                term: {
                                  'event.category': 'process',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                    {
                      term: {
                        'event.kind': 'alert',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        aggs: {
          alerts: {
            filter: {
              term: {
                'event.kind': 'alert',
              },
            },
            aggs: {
              ids: {
                terms: {
                  field: 'process.entity_id',
                },
              },
            },
          },
          events: {
            filter: {
              term: {
                'event.kind': 'event',
              },
            },
            aggs: {
              ids: {
                terms: {
                  field: 'process.entity_id',
                },
              },
            },
          },
        },
      },
      index: fakeEventIndexPattern,
    });
  });
});
