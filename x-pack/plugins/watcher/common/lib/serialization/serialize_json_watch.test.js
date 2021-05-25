/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeJsonWatch } from './serialize_json_watch';

describe('serializeJsonWatch', () => {
  it('serializes with name', () => {
    expect(serializeJsonWatch('test', { foo: 'bar' })).toEqual({
      foo: 'bar',
      metadata: {
        name: 'test',
        xpack: {
          type: 'json',
        },
      },
    });
  });

  it('serializes without name', () => {
    expect(serializeJsonWatch(undefined, { foo: 'bar' })).toEqual({
      foo: 'bar',
      metadata: {
        xpack: {
          type: 'json',
        },
      },
    });
  });

  it('respects provided metadata', () => {
    expect(serializeJsonWatch(undefined, { metadata: { foo: 'bar' } })).toEqual({
      metadata: {
        foo: 'bar',
        xpack: {
          type: 'json',
        },
      },
    });
  });
});
