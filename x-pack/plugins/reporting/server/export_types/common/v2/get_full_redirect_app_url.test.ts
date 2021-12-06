/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ReportingConfig } from '../../../config/config';
import { getFullRedirectAppUrl } from './get_full_redirect_app_url';

describe('getFullRedirectAppUrl', () => {
  let config: ReportingConfig;

  beforeEach(() => {
    const values = {
      server: {
        basePath: 'test',
      },
      kibanaServer: {
        protocol: 'http',
        hostname: 'localhost',
        port: '1234',
      },
    };
    config = {
      get: jest.fn((...args: string[]) => get(values, args)),
      kbnConfig: {
        get: jest.fn((...args: string[]) => get(values, args)),
      },
    };
  });

  test('smoke test', () => {
    expect(getFullRedirectAppUrl(config, 'test', undefined)).toBe(
      'http://localhost:1234/test/s/test/app/reportingRedirect'
    );
  });

  test('adding forceNow', () => {
    expect(getFullRedirectAppUrl(config, 'test', 'TEST with a space')).toBe(
      'http://localhost:1234/test/s/test/app/reportingRedirect?forceNow=TEST%20with%20a%20space'
    );
  });
});
