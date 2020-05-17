/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { set } from 'lodash';
import { MissingRequiredError } from '../error_missing_required';
import { ElasticsearchMetric } from '../metrics';
import { createQuery } from '../create_query.js';

let metric;

describe('Create Query', () => {
  beforeEach(() => {
    metric = ElasticsearchMetric.getMetricFields();
  });

  it('Allows UUID to not be passed', () => {
    const options = { metric };
    const result = createQuery(options);
    const expected = set({}, 'bool.filter', []);
    expect(result).to.be.eql(expected);
  });

  it('Uses Elasticsearch timestamp field for start and end time range by default', () => {
    const options = {
      uuid: 'abc123',
      start: '2016-03-01 10:00:00',
      end: '2016-03-01 10:00:01',
      metric,
    };
    const result = createQuery(options);
    let expected = {};
    expected = set(expected, 'bool.filter[0].term', {
      'source_node.uuid': 'abc123',
    });
    expected = set(expected, 'bool.filter[1].range.timestamp', {
      format: 'epoch_millis',
      gte: 1456826400000,
      lte: 1456826401000,
    });
    expect(result).to.be.eql(expected);
  });

  it('Injects uuid and timestamp fields dynamically, based on metric', () => {
    const options = {
      uuid: 'abc123',
      start: '2016-03-01 10:00:00',
      end: '2016-03-01 10:00:01',
      metric: {
        uuidField: 'testUuidField',
        timestampField: 'testTimestampField',
      },
    };
    const result = createQuery(options);
    let expected = set({}, 'bool.filter[0].term.testUuidField', 'abc123');
    expected = set(expected, 'bool.filter[1].range.testTimestampField', {
      format: 'epoch_millis',
      gte: 1456826400000,
      lte: 1456826401000,
    });
    expect(result).to.be.eql(expected);
  });

  it('Throws if missing metric.timestampField', () => {
    function callCreateQuery() {
      const options = {}; // missing metric object
      return createQuery(options);
    }
    expect(callCreateQuery).to.throwException(e => {
      expect(e).to.be.a(MissingRequiredError);
    });
  });

  it('Throws if given uuid but missing metric.uuidField', () => {
    function callCreateQuery() {
      const options = { uuid: 'abc123', metric };
      delete options.metric.uuidField;
      return createQuery(options);
    }
    expect(callCreateQuery).to.throwException(e => {
      expect(e).to.be.a(MissingRequiredError);
    });
  });

  it('Uses `type` option to add type filter with minimal fields', () => {
    const options = { type: 'test-type-yay', metric };
    const result = createQuery(options);
    let expected = {};
    expected = set(expected, 'bool.filter[0].term', { type: 'test-type-yay' });
    expect(result).to.be.eql(expected);
  });

  it('Uses `type` option to add type filter with all other option fields', () => {
    const options = {
      type: 'test-type-yay',
      uuid: 'abc123',
      start: '2016-03-01 10:00:00',
      end: '2016-03-01 10:00:01',
      metric,
    };
    const result = createQuery(options);
    let expected = {};
    expected = set(expected, 'bool.filter[0].term', { type: 'test-type-yay' });
    expected = set(expected, 'bool.filter[1].term', {
      'source_node.uuid': 'abc123',
    });
    expected = set(expected, 'bool.filter[2].range.timestamp', {
      format: 'epoch_millis',
      gte: 1456826400000,
      lte: 1456826401000,
    });
    expect(result).to.be.eql(expected);
  });
});
