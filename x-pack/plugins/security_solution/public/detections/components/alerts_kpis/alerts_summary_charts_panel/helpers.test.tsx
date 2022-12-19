/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseSeverityData, parseDetectionsData, parseHostData, parseData } from './helpers';
import * as severityMock from './mocks/mock_severity_response';
import * as detectionsMock from './mocks/mock_detections_response';
import * as hostMock from './mocks/mock_host_response';
import type {
  AlertsBySeverityAgg,
  AlertsByRuleAgg,
  AlertsByHostAgg,
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
    const res = parseDetectionsData(
      detectionsMock.mockAlertsData as AlertSearchResponse<{}, AlertsByRuleAgg>
    );
    expect(res).toEqual(detectionsMock.parsedAlerts);
  });

  test('parse severity without data', () => {
    const res = parseDetectionsData(
      detectionsMock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByRuleAgg>
    );
    expect(res).toEqual(null);
  });
});

describe('parse host data', () => {
  test('parse alerts with data', () => {
    const res = parseHostData(hostMock.mockAlertsData as AlertSearchResponse<{}, AlertsByHostAgg>);
    expect(res).toEqual(hostMock.parsedAlerts);
  });

  test('parse severity without data', () => {
    const res = parseHostData(
      hostMock.mockAlertsEmptyData as AlertSearchResponse<{}, AlertsByHostAgg>
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
      'Detections',
      detectionsMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(res).toEqual(detectionsMock.parsedAlerts);
  });

  test('parse host data', () => {
    const res = parseData(
      'Host',
      hostMock.mockAlertsData as AlertSearchResponse<{}, SummaryChartsAgg>
    );
    expect(res).toEqual(hostMock.parsedAlerts);
  });
});
