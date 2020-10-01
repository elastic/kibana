/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig, ReportingCore } from '../../../';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockReportingCore,
  createMockLevelLogger,
} from '../../../test_helpers';
import { getConditionalHeaders } from '../../common';
import { getCustomLogo } from './get_custom_logo';

let mockConfig: ReportingConfig;
let mockReportingPlugin: ReportingCore;

beforeEach(async () => {
  mockConfig = createMockConfig(createMockConfigSchema());
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

  const conditionalHeaders = getConditionalHeaders(mockConfig, permittedHeaders);

  const mockSpaceId = undefined;

  const { logo } = await getCustomLogo(
    mockReportingPlugin,
    conditionalHeaders,
    mockSpaceId,
    createMockLevelLogger()
  );

  expect(mockGet).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(logo).toBe('purple pony');
});
