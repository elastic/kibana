/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock, AlertServicesMock } from '../../../../../../alerts/server/mocks';
import {
  mockLogger,
  sampleWrappedThresholdSignalHit,
  sampleWrappedLegacyThresholdSignalHit,
} from '../__mocks__/es_results';
import { buildRuleMessageFactory } from '../rule_messages';
import { getThresholdBucketFilters } from './get_threshold_bucket_filters';

const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});

describe('getThresholdSignalHistory', () => {
  let mockService: AlertServicesMock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockService = alertsMock.createAlertServices();
  });

  it('should generate a history from pre-7.12 threshold signals', async () => {});

  it('should generate a history from post-7.12 threshold signals', async () => {});

  it('should generate a history from a mixed set of pre- and post-7.12 threshold signals', async () => {});
});
