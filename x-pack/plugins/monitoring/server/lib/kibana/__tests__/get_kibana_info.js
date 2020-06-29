/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { handleResponse } from '../get_kibana_info';

describe('get_kibana_info', () => {
  it('return undefined for empty response', () => {
    const result = handleResponse({});
    expect(result).to.be(undefined);
  });

  it('return mapped data for result with hits, availability = true', () => {
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              kibana_stats: {
                timestamp: moment().format(),
                kibana: {
                  data: 123,
                },
                os: {
                  memory: {
                    free_in_bytes: 123000,
                  },
                },
              },
            },
          },
        ],
      },
    });
    expect(result).to.be.eql({
      availability: true,
      data: 123,
      os_memory_free: 123000,
    });
  });

  it('return mapped data for result with hits, availability = false', () => {
    const result = handleResponse({
      hits: {
        hits: [
          {
            _source: {
              kibana_stats: {
                timestamp: moment().subtract(11, 'minutes').format(),
                kibana: {
                  data: 123,
                },
                os: {
                  memory: {
                    free_in_bytes: 123000,
                  },
                },
              },
            },
          },
        ],
      },
    });
    expect(result).to.be.eql({
      availability: false,
      data: 123,
      os_memory_free: 123000,
    });
  });
});
