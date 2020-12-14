/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExecuteReportTask } from '.';
import { ReportingConfig, ReportingCore } from '../..';
import {
  createMockConfig,
  createMockConfigSchema,
  createMockLevelLogger,
  createMockReportingCore,
} from '../../test_helpers';

const logger = createMockLevelLogger();

describe('Execute Report Logger', () => {
  let mockReporting: ReportingCore;
  let mockConfig: ReportingConfig;
  beforeAll(async () => {
    const mockSchema = createMockConfigSchema();
    mockConfig = createMockConfig(mockSchema);
    mockReporting = await createMockReportingCore(mockConfig);
  });

  it('Is great', () => {
    // FIXME
    const task = new ExecuteReportTask(mockReporting, mockConfig, logger);
    expect(task);
  });
});
