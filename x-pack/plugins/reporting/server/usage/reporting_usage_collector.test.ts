/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { ReportingCore } from '..';
import { createMockReportingCore } from '../test_helpers';
import { registerReportingUsageCollector } from './reporting_usage_collector';

const usageCollectionSetup = usageCollectionPluginMock.createSetupContract();

describe('Reporting Usage Collector', () => {
  let mockReporting: ReportingCore;

  beforeAll(async () => {
    mockReporting = await createMockReportingCore(createMockConfigSchema());
  });

  it('instantiates the collector object', () => {
    const registerCollectorSpy = jest.spyOn(usageCollectionSetup, 'registerCollector');
    registerReportingUsageCollector(mockReporting, usageCollectionSetup);

    expect(registerCollectorSpy).toBeCalledTimes(1);
    expect(registerCollectorSpy).toBeCalledWith(
      expect.objectContaining({
        type: 'reporting',
        isReady: expect.any(Function),
        fetch: expect.any(Function),
        schema: {
          available: { type: 'boolean' },
          enabled: { type: 'boolean' },
        },
      })
    );
  });
});
