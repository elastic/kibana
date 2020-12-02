/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig, ReportingCore } from '../../../';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../../test_helpers';
import { getConditionalHeaders } from '../../common';
import { getCustomLogo } from './get_custom_logo';

let mockConfig: ReportingConfig;
let mockReportingPlugin: ReportingCore;

const logger = createMockLevelLogger();

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
  mockGet.mockImplementationOnce((...args: string[]) => {
    if (args[0] === 'xpackReporting:customPdfLogo') {
      return 'purple pony';
    }
    throw new Error('wrong caller args!');
  });
  mockReportingPlugin.getUiSettingsServiceFactory = jest.fn().mockResolvedValue({
    get: mockGet,
  });

  const conditionalHeaders = getConditionalHeaders(mockConfig, permittedHeaders);

  const { logo } = await getCustomLogo(
    mockReportingPlugin,
    conditionalHeaders,
    'spaceyMcSpaceIdFace',
    logger
  );

  expect(mockGet).toBeCalledWith('xpackReporting:customPdfLogo');
  expect(logo).toBe('purple pony');
});
