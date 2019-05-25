/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { set } from 'lodash';
import { createTypeFilter, createQuery } from '../create_query.js';

describe('Create Type Filter', () => {
  it('Builds a type filter syntax', () => {
    const typeFilter = createTypeFilter('my_type');
    expect(typeFilter).to.eql({
      bool: { should: [
        { term: { _type: 'my_type' } },
        { term: { type: 'my_type' } }
      ] }
    });
  });
});

describe('Create Query', () => {
  it('Uses timestamp field for start and end time range by default', () => {
    const options = { start: '2016-03-01 10:00:00', end: '2016-03-01 10:00:01' };
    const result = createQuery(options);
    const expected = {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                format: 'epoch_millis',
                gte: 1456826400000,
                lte: 1456826401000
              }
            }
          }
        ]
      }
    };
    expect(result).to.be.eql(expected);
  });

  it('Uses `type` option to add type filter with minimal fields', () => {
    const options = { type: 'test-type-yay' };
    const result = createQuery(options);
    let expected = {};
    expected = set(expected, 'bool.filter[0].bool.should', [ { term: { _type: 'test-type-yay' } }, { term: { type: 'test-type-yay' } } ]);
    expect(result).to.be.eql(expected);
  });

  it('Uses `type` option to add type filter with all other option fields', () => {
    const options = {
      type: 'test-type-yay',
      start: '2016-03-01 10:00:00',
      end: '2016-03-01 10:00:01',
    };
    const result = createQuery(options);
    const expected = {
      bool: {
        filter: [
          {
            bool: {
              should: [
                { term: { _type: 'test-type-yay' } },
                { term: { type: 'test-type-yay' } }
              ]
            }
          },
          {
            range: {
              timestamp: {
                format: 'epoch_millis',
                gte: 1456826400000,
                lte: 1456826401000
              }
            }
          }
        ]
      }
    };
    expect(result).to.be.eql(expected);
  });
});
