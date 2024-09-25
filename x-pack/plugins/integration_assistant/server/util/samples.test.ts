/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from './samples';

describe('merge', () => {
  it('Should return source if target is empty', async () => {
    const target = {};
    const source = { target: 'user.name', confidence: 0.9, type: 'string', date_formats: [] };

    const result = merge(target, source);

    expect(result).toEqual(source);
  });

  it('Should return target if source is empty', async () => {
    const target = { hostname: '0.0.0.0', 'teleport.internal/resource-id': '1234' };
    const source = {};

    const result = merge(target, source);

    expect(result).toEqual(target);
  });

  it('Should return one result', async () => {
    const target = {
      aaa: {
        ei: 0,
        event: 'cert.create',
        uid: '1234',
        cluster_name: 'cluster.com',
        identity: { user: 'teleport-admin' },
        server_labels: { hostname: 'some-hostname' },
      },
    };
    const source = {
      aaa: {
        ei: 0,
        event: 'session.start',
        uid: '4567',
        cluster_name: 'cluster.com',
        user: 'teleport-admin',
        server_labels: { hostname: 'some-other-hostname', id: '1234' },
      },
    };

    const result = merge(target, source);

    expect(result).toEqual({
      aaa: {
        ei: 0,
        event: 'cert.create',
        uid: '1234',
        cluster_name: 'cluster.com',
        identity: { user: 'teleport-admin' },
        server_labels: { hostname: 'some-hostname', id: '1234' },
        user: 'teleport-admin',
      },
    });
  });

  it('Should not merge built-in properties of neither target nor source', async () => {
    const target = {
      __proto__: 'some properties',
      constructor: 'some other properties',
      hostname: '0.0.0.0',
      'teleport.internal/resource-id': '1234',
    };
    const source = {
      __proto__: 'some properties of source',
      constructor: 'some other properties of source',
    };

    const result = merge(target, source);

    expect(result).toEqual({ hostname: '0.0.0.0', 'teleport.internal/resource-id': '1234' });
  });

  it('Should keep source object if it collides with target key that is not an object', async () => {
    const target = {
      hostname: '',
      'teleport.internal/resource-id': '1234',
      date_formats: 'format',
    };
    const source = {
      target: 'user.name',
      confidence: 0.9,
      type: 'string',
      date_formats: { key: 'value' },
    };

    const result = merge(target, source);

    expect(result).toEqual({
      'teleport.internal/resource-id': '1234',
      target: 'user.name',
      confidence: 0.9,
      type: 'string',
      hostname: '',
      date_formats: { key: 'value' },
    });
  });

  it('Should copy array into the result', async () => {
    const target = { date_formats: ['a', 'b'] };
    const source = { target: 'user.name', confidence: 0.9, type: 'string', date_formats: ['c'] };

    const result = merge(target, source);

    expect(result).toEqual(source);
  });
});
