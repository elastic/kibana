/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTransformOptions } from './configurations';

describe('getTransformOptions', () => {
  it('transform content has changed, please update the transform version and regenerate the snapshot', () => {
    const options = getTransformOptions({
      dest: 'dest',
      source: ['source'],
    });

    expect(options).toMatchInlineSnapshot(`
      Object {
        "_meta": Object {
          "managed": true,
          "managed_by": "security-entity-analytics",
          "version": 2,
        },
        "dest": Object {
          "index": "dest",
        },
        "frequency": "1h",
        "latest": Object {
          "sort": "@timestamp",
          "unique_key": Array [
            "host.name",
            "user.name",
          ],
        },
        "settings": Object {
          "unattended": true,
        },
        "source": Object {
          "index": Array [
            "source",
          ],
        },
        "sync": Object {
          "time": Object {
            "delay": "0s",
            "field": "@timestamp",
          },
        },
      }
    `);
  });
});
