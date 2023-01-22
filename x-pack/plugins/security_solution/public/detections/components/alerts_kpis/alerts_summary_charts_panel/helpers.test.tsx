/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseData } from './helpers';
import * as severityMock from '../severity_level_panel/mock_data';
import * as alertsTypeMock from '../alerts_by_type_panel/mock_data';
import * as alertsGroupingMock from '../alerts_progress_bar_panel/mock_data';
import type { SummaryChartsAgg } from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse data by aggregation type', () => {
  test('parse severity data', () => {
    const res = parseData(
      'Severity',
      severityMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(res).toEqual(severityMock.parsedAlerts);
  });

  test('parse detections data', () => {
    const res = parseData(
      'Type',
      alertsTypeMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(res).toEqual(alertsTypeMock.parsedAlerts);
  });

  test('parse host data', () => {
    const res = parseData(
      'Top',
      alertsGroupingMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(res).toEqual(alertsGroupingMock.parsedAlerts);
  });
});
