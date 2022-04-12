/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { ReportingCore } from '../../';
import { createMockConfigSchema, createMockReportingCore } from '../../test_helpers';
import { getCustomLogo } from './get_custom_logo';

let mockReportingPlugin: ReportingCore;

const logger = loggingSystemMock.createLogger();

beforeEach(async () => {
  mockReportingPlugin = await createMockReportingCore(createMockConfigSchema());
});

test(`gets logo from uiSettings`, async () => {
  const headers = {
    foo: 'bar',
    baz: 'quix',
  };

  const mockGet = jest.fn();
  mockGet.mockImplementationOnce((...args: string[]) => {
    if (args[0] === 'xpackReporting:customPdfLogo') {
      return 'purple pony';
    }
    throw new Error('wrong caller args!');
  });
  mockReportingPlugin.getUiSettingsServiceFactory = jest.fn().mockResolvedValue({
    get: mockGet,
  });

  const { logo } = await getCustomLogo(mockReportingPlugin, headers, 'spaceyMcSpaceIdFace', logger);

  expect(mockGet).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(logo).toBe('purple pony');
});
