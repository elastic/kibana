/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingCore } from '../../core';
import { createMockReportingCore } from '../../test_helpers';
import { ScheduledTaskParamsPDF } from '../printable_pdf/types';
import { getConditionalHeaders, getCustomLogo } from './';

const mockConfigGet = jest.fn().mockImplementation((key: string) => {
  return 'localhost';
});
const mockConfig = { get: mockConfigGet, kbnConfig: { get: mockConfigGet } };

let mockReportingPlugin: ReportingCore;
beforeEach(async () => {
  mockReportingPlugin = await createMockReportingCore(mockConfig);
});

test(`gets logo from uiSettings`, async () => {
  const permittedHeaders = {
    foo: 'bar',
    baz: 'quix',
  };

  const mockGet = jest.fn();
  mockGet.mockImplementationOnce((...args: any[]) => {
    if (args[0] === 'xpackReporting:customPdfLogo') {
      return 'purple pony';
    }
    throw new Error('wrong caller args!');
  });
  mockReportingPlugin.getUiSettingsServiceFactory = jest.fn().mockResolvedValue({
    get: mockGet,
  });

  const conditionalHeaders = await getConditionalHeaders({
    job: {} as ScheduledTaskParamsPDF,
    filteredHeaders: permittedHeaders,
    config: mockConfig,
  });

  const { logo } = await getCustomLogo({
    reporting: mockReportingPlugin,
    config: mockConfig,
    job: {} as ScheduledTaskParamsPDF,
    conditionalHeaders,
  });

  expect(mockGet).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(logo).toBe('purple pony');
});
