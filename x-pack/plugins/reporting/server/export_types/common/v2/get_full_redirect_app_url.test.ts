/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportingConfigType } from '../../../config';
import { createMockConfigSchema, createMockReportingCore } from '../../../test_helpers';
import { PdfCore } from '../../printable_pdf/types';
import { getFullRedirectAppUrl } from './get_full_redirect_app_url';

describe('getFullRedirectAppUrl', () => {
  let reporting: PdfCore;
  beforeEach(async () => {
    reporting = await createMockReportingCore(createMockConfigSchema());
    reporting.getConfig = jest.fn(() => ({ kibanaServer: {} } as unknown as ReportingConfigType));
    reporting.getServerInfo = jest.fn(() => ({
      name: 'localhost',
      uuid: 'test-test-test-test',
      basePath: 'test',
      protocol: 'http',
      hostname: 'localhost',
      port: 1234,
    }));
  });

  test('smoke test', () => {
    expect(getFullRedirectAppUrl(reporting, 'test', undefined)).toBe(
      'http://localhost:1234/test/s/test/app/reportingRedirect'
    );
  });

  test('adding forceNow', () => {
    expect(getFullRedirectAppUrl(reporting, 'test', 'TEST with a space')).toBe(
      'http://localhost:1234/test/s/test/app/reportingRedirect?forceNow=TEST%20with%20a%20space'
    );
  });
});
