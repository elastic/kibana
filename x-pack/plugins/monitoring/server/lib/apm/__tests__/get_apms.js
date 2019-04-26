/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from '../get_apms';
import expect from '@kbn/expect';

const start = 1515534342000;
const end = 1515541592880;
const response = {
  hits: {
    hits: [
      {
        _source: {
          beats_stats: {
            timestamp: end,
            beat: {
              uuid: 'fooUuid',
              host: 'beat-listing.test',
              name: 'beat-listing.test-0101',
              type: 'filebeat',
              version: '6.2.0'
            },
            metrics: {
              beat: {
                memstats: {
                  memory_alloc: 2340
                }
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
                  }
                },
                pipeline: {
                  events: {
                    total: 23000
                  }
                }
              }
            }
          }
        },
        inner_hits: {
          earliest: {
            hits: {
              hits: [
                {
                  _source: {
                    beats_stats: {
                      timestamp: start,
                      metrics: {
                        libbeat: {
                          output: {
                            write: {
                              bytes: 4000,
                              errors: 3,
                            },
                            read: {
                              errors: 1,
                            }
                          },
                          pipeline: {
                            events: {
                              total: 2300
                            }
                          }
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    ]
  }
};

describe('apm/get_apms', () => {
  it('Timestamp is desc', () => {
    const responseMulti = { hits: { hits: [] } };
    const hit = response.hits.hits[0];
    const ver = ['6.6.2', '7.0.0-rc1', '6.7.1'];

    for (let i = 0, l = ver.length; i < l; ++i) {
      const newBeat = JSON.parse(JSON.stringify({ ...hit }));
      const { beats_stats: beatsStats } = newBeat._source;
      beatsStats.timestamp = `2019-01-0${i + 1}T05:00:00.000Z`;
      beatsStats.beat.version = ver[i];
      beatsStats.beat.uuid = `${i}${beatsStats.beat.uuid}`;
      responseMulti.hits.hits.push(newBeat);
    }

    const beats = handleResponse(responseMulti, start, end);
    expect(beats[0].version).to.eql(ver[0]);
    expect(beats[1].version).to.eql(ver[1]);
    expect(beats[2].version).to.eql(ver[2]);
  });
});
