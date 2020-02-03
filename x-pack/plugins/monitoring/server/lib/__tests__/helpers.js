/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const response = {
  hits: {
    hits: [
      {
        _source: {
          beats_stats: {
            timestamp: 1515541592880,
            beat: {
              uuid: 'fooUuid',
              host: 'beat-listing.test',
              name: 'beat-listing.test-0101',
              type: 'filebeat',
              version: '6.2.0',
            },
            metrics: {
              beat: {
                memstats: {
                  memory_alloc: 2340,
                },
              },
              libbeat: {
                output: {
                  type: 'Redis',
                  write: {
                    bytes: 140000,
                    errors: 8,
                  },
                  read: {
                    errors: 3,
                  },
                },
                pipeline: {
                  events: {
                    total: 23000,
                  },
                },
              },
            },
          },
        },
        inner_hits: {
          earliest: {
            hits: {
              hits: [
                {
                  _source: {
                    beats_stats: {
                      timestamp: 1515534342000,
                      metrics: {
                        libbeat: {
                          output: {
                            write: {
                              bytes: 4000,
                              errors: 3,
                            },
                            read: {
                              errors: 1,
                            },
                          },
                          pipeline: {
                            events: {
                              total: 2300,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ],
  },
};

export const defaultResponseSort = handleResponse => {
  const responseMulti = { hits: { hits: [] } };
  const hit = response.hits.hits[0];
  const version = ['6.6.2', '7.0.0-rc1', '6.7.1'];

  for (let i = 0, l = version.length; i < l; ++i) {
    // Deep clone the object to preserve the original
    const newBeat = JSON.parse(JSON.stringify({ ...hit }));
    const { beats_stats: beatsStats } = newBeat._source;
    beatsStats.timestamp = `2019-01-0${i + 1}T05:00:00.000Z`;
    beatsStats.beat.version = version[i];
    beatsStats.beat.uuid = `${i}${beatsStats.beat.uuid}`;
    responseMulti.hits.hits.push(newBeat);
  }

  return { beats: handleResponse(responseMulti, 0, 0), version };
};
