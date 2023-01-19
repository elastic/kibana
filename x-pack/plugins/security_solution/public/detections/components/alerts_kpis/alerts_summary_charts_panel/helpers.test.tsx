/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  parseSeverityData,
  parseAlertsTypeData,
  parseAlertsGroupingData,
  parseData,
} from './helpers';
import * as severityMock from './mocks/mock_severity_response';
import * as alertsTypeMock from './mocks/mock_alerts_type_response';
import * as alertsGroupingMock from './mocks/mock_alerts_grouping_response';
import type {
  AlertsBySeverityAgg,
  AlertsByTypeAgg,
  AlertsByGroupingAgg,
  SummaryChartsAgg,
} from './types';
import type { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';

describe('parse severity data', () => {
  test('parse alerts with data', () => {
    const res = parseSeverityData(
      severityMock.mockAlertsData as AlertSearchResponse<{}, AlertsBySeverityAgg>
    );
    expect(res).toEqual(severityMock.parsedAlerts);
  });

  test('parse severity without data', () => {
    const res = parseSeverityData(
      severityMock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsBySeverityAgg>
    );
    expect(res).toEqual(null);
  });
});

describe('parse detections data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsTypeData(
      alertsTypeMock.mockAlertsData as AlertSearchResponse<{}, AlertsByTypeAgg>
    );
    expect(res).toEqual(alertsTypeMock.parsedAlerts);
  });

  test('parse severity without data', () => {
    const res = parseAlertsTypeData(
      alertsTypeMock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByTypeAgg>
    );
    expect(res).toEqual(null);
  });
});

describe('parse host data', () => {
  test('parse alerts with data', () => {
    const res = parseAlertsGroupingData(
      alertsGroupingMock.mockAlertsData as AlertSearchResponse<{}, AlertsByGroupingAgg>
    );
    expect(res).toEqual(alertsGroupingMock.parsedAlerts);
  });

  test('parse severity without data', () => {
    const res = parseAlertsGroupingData(
      alertsGroupingMock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByGroupingAgg>
    );
    expect(res).toEqual(null);
  });
});

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
