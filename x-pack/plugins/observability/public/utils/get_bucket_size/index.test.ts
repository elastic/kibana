/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getBucketSize } from './index';
import moment from 'moment';

describe('getBuckets', () => {
  describe("minInterval 'auto'", () => {
    it('last 15 minutes', () => {
      const start = moment().subtract(15, 'minutes').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: 'auto' })).toEqual({
        bucketSize: 10,
        intervalString: '10s',
      });
    });
    it('last 1 hour', () => {
      const start = moment().subtract(1, 'hour').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: 'auto' })).toEqual({
        bucketSize: 30,
        intervalString: '30s',
      });
    });
    it('last 1 week', () => {
      const start = moment().subtract(1, 'week').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: 'auto' })).toEqual({
        bucketSize: 3600,
        intervalString: '3600s',
      });
    });
    it('last 30 days', () => {
      const start = moment().subtract(30, 'days').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: 'auto' })).toEqual({
        bucketSize: 43200,
        intervalString: '43200s',
      });
    });
    it('last 1 year', () => {
      const start = moment().subtract(1, 'year').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: 'auto' })).toEqual({
        bucketSize: 86400,
        intervalString: '86400s',
      });
    });
  });
  describe("minInterval '30s'", () => {
    it('last 15 minutes', () => {
      const start = moment().subtract(15, 'minutes').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: '30s' })).toEqual({
        bucketSize: 30,
        intervalString: '30s',
      });
    });
    it('last 1 year', () => {
      const start = moment().subtract(1, 'year').valueOf();
      const end = moment.now();
      expect(getBucketSize({ start, end, minInterval: '30s' })).toEqual({
        bucketSize: 86400,
        intervalString: '86400s',
      });
    });
  });
});
