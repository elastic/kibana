/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { config } from './config';

describe('config schema', () => {
  it('generates proper defaults', () => {
    expect(config.schema.validate({})).toEqual({
      enabled: false,
      logger: {
        enabled: false,
      },
    });
  });

  it('accepts an appender', () => {
    const appender = config.schema.validate({
      appender: {
        kind: 'file',
        path: '/path/to/file.txt',
        layout: {
          kind: 'json',
        },
      },
      logger: {
        enabled: false,
      },
    }).appender;

    expect(appender).toEqual({
      kind: 'file',
      path: '/path/to/file.txt',
      layout: {
        kind: 'json',
      },
    });
  });

  it('rejects an appender if not fully configured', () => {
    expect(() =>
      config.schema.validate({
        // no layout configured
        appender: {
          kind: 'file',
          path: '/path/to/file.txt',
        },
        logger: {
          enabled: false,
        },
      })
    ).toThrow();
  });
});
