/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfig } from '../../';
import { createMockConfig, createMockConfigSchema } from '../../test_helpers';
import { getConditionalHeaders } from './';

let mockConfig: ReportingConfig;

beforeEach(async () => {
  const reportingConfig = { kibanaServer: { hostname: 'custom-hostname' } };
  const mockSchema = createMockConfigSchema(reportingConfig);
  mockConfig = createMockConfig(mockSchema);
});

describe('conditions', () => {
  test(`uses hostname from reporting config if set`, async () => {
    const permittedHeaders = {
      foo: 'bar',
      baz: 'quix',
    };

    const conditionalHeaders = getConditionalHeaders(mockConfig, permittedHeaders);

    expect(conditionalHeaders.conditions.hostname).toEqual(
      mockConfig.get('kibanaServer', 'hostname')
    );
    expect(conditionalHeaders.conditions.port).toEqual(mockConfig.get('kibanaServer', 'port'));
    expect(conditionalHeaders.conditions.protocol).toEqual(
      mockConfig.get('kibanaServer', 'protocol')
    );
    expect(conditionalHeaders.conditions.basePath).toEqual(
      mockConfig.kbnConfig.get('server', 'basePath')
    );
  });
});

describe('config formatting', () => {
  test(`lowercases kibanaServer.hostname`, async () => {
    const reportingConfig = { kibanaServer: { hostname: 'GREAT-HOSTNAME' } };
    const mockSchema = createMockConfigSchema(reportingConfig);
    mockConfig = createMockConfig(mockSchema);

    const conditionalHeaders = getConditionalHeaders(mockConfig, {});
    expect(conditionalHeaders.conditions.hostname).toEqual('great-hostname');
  });
});
