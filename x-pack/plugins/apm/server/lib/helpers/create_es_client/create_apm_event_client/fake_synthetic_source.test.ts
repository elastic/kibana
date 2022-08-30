/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fakeSyntheticSource } from './fake_synthetic_source';

describe('fakeSyntheticSource', () => {
  it('flattens and unflattens objects', () => {
    const obj = {
      service: {
        name: 'my-service',
      },
      transaction: {
        type: 'request',
        name: 'GET /api/my-transaction',
      },
    };

    expect(fakeSyntheticSource(obj)).toEqual(obj);
  });

  it('drops null and undefined values', () => {
    const obj = {
      service: {
        name: null,
      },
      transaction: {
        type: 'request',
        name: 'GET /api/my-transaction',
      },
    };

    expect(fakeSyntheticSource(obj)).toEqual({
      transaction: {
        type: 'request',
        name: 'GET /api/my-transaction',
      },
    });
  });

  it('only wraps multiple values in an array', () => {
    const obj = {
      span: {
        links: [
          { trace: { id: '1' }, span: { id: '1' } },
          { trace: { id: '2' }, span: { id: '2' } },
        ],
      },
    };

    expect(fakeSyntheticSource(obj)).toEqual({
      span: {
        links: {
          trace: {
            id: ['1', '2'],
          },
          span: {
            id: ['1', '2'],
          },
        },
      },
    });
  });

  it('deduplicates and sorts array values', () => {
    const obj = {
      span: {
        links: [
          { trace: { id: '3' }, span: { id: '1' } },
          { trace: { id: '1' }, span: { id: '1' } },
          { trace: { id: '1' }, span: { id: '4' } },
        ],
      },
    };

    expect(fakeSyntheticSource(obj)).toEqual({
      span: {
        links: {
          trace: {
            id: ['1', '3'],
          },
          span: {
            id: ['1', '4'],
          },
        },
      },
    });
  });
});
