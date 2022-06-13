/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SingleEventLogStatusMetric } from '../../detections/rules/types';
import { loggingSystemMock } from 'src/core/server/mocks';
import {
  getElasticLogCustomRules,
  getEventLogAllRules,
  getEventLogAllRulesResult,
  getEventLogCustomRulesResult,
  getEventLogElasticRules,
  getEventLogElasticRulesResult,
} from '../../detections/rules/get_metrics.mocks';
import { transformEventLogTypeStatus } from './transform_event_log_type_status';

describe('transform_event_log_type_status', () => {
  test('returns expected transform for all rules results', () => {
    const logger = loggingSystemMock.createLogger();
    const result = transformEventLogTypeStatus({
      logger,
      aggs: getEventLogAllRules().aggregations,
    });
    expect(result).toEqual<SingleEventLogStatusMetric>(getEventLogAllRulesResult());
  });

  test('returns expected transform for elastic rules results', () => {
    const logger = loggingSystemMock.createLogger();
    const result = transformEventLogTypeStatus({
      logger,
      aggs: getEventLogElasticRules().aggregations,
    });
    expect(result).toEqual<SingleEventLogStatusMetric>(getEventLogElasticRulesResult());
  });

  test('returns expected transform for custom rules results', () => {
    const logger = loggingSystemMock.createLogger();
    const result = transformEventLogTypeStatus({
      logger,
      aggs: getElasticLogCustomRules().aggregations,
    });
    expect(result).toEqual<SingleEventLogStatusMetric>(getEventLogCustomRulesResult());
  });
});
