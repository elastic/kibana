/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseAlertsTypeData } from './helpers';
import * as mock from './mock_data';
import type { AlertsByTypeAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse alerts by type data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsTypeData(
      mock.mockAlertsData as AlertSearchResponse<{}, AlertsByTypeAgg>
    );
    expect(res).toEqual(mock.parsedAlerts);
  });

  test('parse alerts without data', () => {
    const res = parseAlertsTypeData(
      mock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByTypeAgg>
    );
    expect(res).toEqual([]);
  });
});
