/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAlertsTypeData, parseAlertsRuleData } from './helpers';
import * as mockType from './mock_type_data';
import * as mockRule from './mock_rule_data';
import type { AlertsByTypeAgg, AlertsByRuleAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse alerts by type data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsTypeData(
      mockType.mockAlertsData as AlertSearchResponse<{}, AlertsByTypeAgg>
    );
    expect(res).toEqual(mockType.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsTypeData(
      mockType.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByTypeAgg>
    );
    expect(res).toEqual([]);
  });
});

describe('parse alerts by rule data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsRuleData(
      mockRule.mockAlertsData as AlertSearchResponse<{}, AlertsByRuleAgg>
    );
    expect(res).toEqual(mockRule.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsRuleData(
      mockRule.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByRuleAgg>
    );
    expect(res).toEqual([]);
  });
});
