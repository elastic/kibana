/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExecuteReportTask } from '.';
import { ReportingCore } from '../..';
import { ReportingConfigType } from '../../config';
import { createMockConfigSchema, createMockLevelLogger } from '../../test_helpers';

const logger = createMockLevelLogger();

describe('Execute Report Logger', () => {
  let mockReporting: ReportingCore;
  let mockSchema: ReportingConfigType;
  beforeAll(async () => {
    mockSchema = createMockConfigSchema();
  });

  it('Is great', () => {
    // FIXME
    const task = new ExecuteReportTask(mockReporting, mockSchema, logger);
    expect(task);
  });
});
