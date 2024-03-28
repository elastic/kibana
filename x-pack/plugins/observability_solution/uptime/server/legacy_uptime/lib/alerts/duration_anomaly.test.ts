/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { durationAnomalyAlertFactory } from './duration_anomaly';
import { DURATION_ANOMALY } from '../../../../common/constants/uptime_alerts';
import {
  getSeverityType,
  type MlAnomaliesTableRecord,
  type MlAnomalyRecordDoc,
} from '@kbn/ml-anomaly-utils';
import { createRuleTypeMocks, bootstrapDependencies } from './test_utils';
import { Ping } from '../../../../common/runtime_types/ping';

interface MockAnomaly {
  severity: MlAnomaliesTableRecord['severity'];
  source: Partial<MlAnomalyRecordDoc>;
  actualSort: MlAnomaliesTableRecord['actualSort'];
  typicalSort: MlAnomaliesTableRecord['typicalSort'];
  entityValue: MlAnomaliesTableRecord['entityValue'];
}

interface MockAnomalyResult {
  anomalies: MockAnomaly[];
}

const monitorId = 'uptime-monitor';
const mockUrl = 'https://elastic.co';

const mockAnomaliesResult: MockAnomalyResult = {
  anomalies: [
    {
      severity: 25,
      source: {
        timestamp: 1622137799,
        'monitor.id': 'uptime-monitor',
        bucket_span: 900,
      },
      actualSort: 200000,
      typicalSort: 10000,
      entityValue: 'harrisburg',
    },
    {
      severity: 10,
      source: {
        timestamp: 1622137799,
        'monitor.id': 'uptime-monitor',
        bucket_span: 900,
      },
      actualSort: 300000,
      typicalSort: 20000,
      entityValue: 'fairbanks',
    },
  ],
};

const mockPing: Partial<Ping> = {
  url: {
    full: mockUrl,
  },
};

const mockRecoveredAlerts = mockAnomaliesResult.anomalies.map((result) => ({
  alertDetailsUrl: 'mockedAlertsLocator > getLocation',
  firstCheckedAt: 'date',
  firstTriggeredAt: undefined,
  lastCheckedAt: 'date',
  lastResolvedAt: undefined,
  isTriggered: false,
  anomalyStartTimestamp: 'date',
  currentTriggerStarted: undefined,
  expectedResponseTime: `${Math.round(result.typicalSort / 1000)} ms`,
  lastTriggeredAt: undefined,
  monitor: monitorId,
  monitorUrl: mockPing.url?.full,
  observerLocation: result.entityValue,
  severity: getSeverityType(result.severity),
  severityScore: result.severity,
  slowestAnomalyResponse: `${Math.round(result.actualSort / 1000)} ms`,
  bucketSpan: result.source.bucket_span,
}));

/**
 * This function aims to provide an easy way to give mock props that will
 * reduce boilerplate for tests.
 * @param dynamic the expiration and aging thresholds received at alert creation time
 * @param params the params received at alert creation time
 * @param state the state the alert maintains
 */
const mockOptions = (
  state = {},
  params = {
    timerange: { from: 'now-15m', to: 'now' },
    monitorId,
    severity: 'warning',
  }
): any => {
  const { services, setContext } = createRuleTypeMocks(mockRecoveredAlerts);

  return {
    params,
    state,
    services,
    setContext,
    startedAt: new Date(),
  };
};

describe('duration anomaly alert', () => {
  let toISOStringSpy: jest.SpyInstance<string, []>;
  const mockDate = 'date';
  beforeAll(() => {
    Date.now = jest.fn().mockReturnValue(new Date('2021-05-13T12:33:37.000Z'));
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      format: jest.fn(),
      formatToParts: jest.fn(),
      formatRange: jest.fn(),
      formatRangeToParts: jest.fn(),
      resolvedOptions: () => ({
        locale: '',
        calendar: '',
        numberingSystem: '',
        timeZone: 'UTC',
      }),
    }));
    toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString');
  });

  describe('alert executor', () => {
    it('triggers when aging or expiring alerts are found', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const mockResultServiceProviderGetter: jest.Mock<{
        getAnomaliesTableData: jest.Mock<MockAnomalyResult>;
      }> = jest.fn();
      const mockGetAnomliesTableDataGetter: jest.Mock<MockAnomalyResult> = jest.fn();
      const mockGetLatestMonitorGetter: jest.Mock<Partial<Ping>> = jest.fn();

      mockGetLatestMonitorGetter.mockReturnValue(mockPing);
      mockGetAnomliesTableDataGetter.mockReturnValue(mockAnomaliesResult);
      mockResultServiceProviderGetter.mockReturnValue({
        getAnomaliesTableData: mockGetAnomliesTableDataGetter,
      });
      const { server, libs, plugins } = bootstrapDependencies(
        { getLatestMonitor: mockGetLatestMonitorGetter },
        {
          ml: {
            resultsServiceProvider: mockResultServiceProviderGetter,
          },
        }
      );
      const alert = durationAnomalyAlertFactory(server, libs, plugins);
      const options = mockOptions();
      const {
        services: { alertWithLifecycle },
      } = options;
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(options);
      expect(mockGetAnomliesTableDataGetter).toHaveBeenCalledTimes(1);
      expect(alertWithLifecycle).toHaveBeenCalledTimes(2);
      expect(mockGetAnomliesTableDataGetter).toBeCalledWith(
        ['uptime_monitor_high_latency_by_geo'],
        [],
        [],
        'auto',
        options.params.severity,
        1620907417000,
        1620909217000,
        'UTC',
        500,
        10,
        undefined
      );
      const [{ value: alertInstanceMock }] = alertWithLifecycle.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledTimes(2);
      const reasonMessages: string[] = [];
      mockAnomaliesResult.anomalies.forEach((anomaly, index) => {
        const slowestResponse = Math.round(anomaly.actualSort / 1000);
        const typicalResponse = Math.round(anomaly.typicalSort / 1000);
        expect(alertWithLifecycle).toBeCalledWith({
          fields: {
            'monitor.id': options.params.monitorId,
            'url.full': mockPing.url?.full,
            'anomaly.start': mockDate,
            'anomaly.bucket_span.minutes': anomaly.source.bucket_span,
            'observer.geo.name': anomaly.entityValue,
            [ALERT_EVALUATION_VALUE]: anomaly.actualSort,
            [ALERT_EVALUATION_THRESHOLD]: anomaly.typicalSort,
            [ALERT_REASON]: `Abnormal (${getSeverityType(
              anomaly.severity
            )} level) response time detected on uptime-monitor with url ${
              mockPing.url?.full
            } at date. Anomaly severity score is ${anomaly.severity}.
Response times as high as ${slowestResponse} ms have been detected from location ${
              anomaly.entityValue
            }. Expected response time is ${typicalResponse} ms.`,
          },
          id: `${DURATION_ANOMALY.id}${index}`,
        });

        expect(alertInstanceMock.replaceState).toBeCalledWith({
          firstCheckedAt: 'date',
          firstTriggeredAt: undefined,
          lastCheckedAt: 'date',
          lastResolvedAt: undefined,
          isTriggered: false,
          anomalyStartTimestamp: 'date',
          currentTriggerStarted: undefined,
          expectedResponseTime: `${typicalResponse} ms`,
          lastTriggeredAt: undefined,
          monitor: monitorId,
          monitorUrl: mockPing.url?.full,
          observerLocation: anomaly.entityValue,
          severity: getSeverityType(anomaly.severity),
          severityScore: anomaly.severity,
          slowestAnomalyResponse: `${slowestResponse} ms`,
          bucketSpan: anomaly.source.bucket_span,
        });
        const reasonMsg = `Abnormal (${getSeverityType(
          anomaly.severity
        )} level) response time detected on uptime-monitor with url ${
          mockPing.url?.full
        } at date. Anomaly severity score is ${anomaly.severity}.
Response times as high as ${slowestResponse} ms have been detected from location ${
          anomaly.entityValue
        }. Expected response time is ${typicalResponse} ms.`;

        reasonMessages.push(reasonMsg);
      });
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledTimes(2);

      expect(alertInstanceMock.scheduleActions.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "xpack.uptime.alerts.actionGroups.durationAnomaly",
          Object {
            "alertDetailsUrl": "mockedAlertsLocator > getLocation",
            "anomalyStartTimestamp": "date",
            "bucketSpan": 900,
            "expectedResponseTime": "10 ms",
            "monitor": "uptime-monitor",
            "monitorUrl": "https://elastic.co",
            "observerLocation": "harrisburg",
            "reason": "Abnormal (minor level) response time detected on uptime-monitor with url https://elastic.co at date. Anomaly severity score is 25.
        Response times as high as 200 ms have been detected from location harrisburg. Expected response time is 10 ms.",
            "severity": "minor",
            "severityScore": 25,
            "slowestAnomalyResponse": "200 ms",
            "viewInAppUrl": "http://localhost:5601/hfe/app/uptime/monitor/eHBhY2sudXB0aW1lLmFsZXJ0cy5hY3Rpb25Hcm91cHMuZHVyYXRpb25Bbm9tYWx5MA==?dateRangeEnd=now&dateRangeStart=2022-03-17T13%3A13%3A33.755Z",
          },
        ]
      `);
      expect(alertInstanceMock.scheduleActions.mock.calls[1]).toMatchInlineSnapshot(`
        Array [
          "xpack.uptime.alerts.actionGroups.durationAnomaly",
          Object {
            "alertDetailsUrl": "mockedAlertsLocator > getLocation",
            "anomalyStartTimestamp": "date",
            "bucketSpan": 900,
            "expectedResponseTime": "20 ms",
            "monitor": "uptime-monitor",
            "monitorUrl": "https://elastic.co",
            "observerLocation": "fairbanks",
            "reason": "Abnormal (warning level) response time detected on uptime-monitor with url https://elastic.co at date. Anomaly severity score is 10.
        Response times as high as 300 ms have been detected from location fairbanks. Expected response time is 20 ms.",
            "severity": "warning",
            "severityScore": 10,
            "slowestAnomalyResponse": "300 ms",
            "viewInAppUrl": "http://localhost:5601/hfe/app/uptime/monitor/eHBhY2sudXB0aW1lLmFsZXJ0cy5hY3Rpb25Hcm91cHMuZHVyYXRpb25Bbm9tYWx5MQ==?dateRangeEnd=now&dateRangeStart=2022-03-17T13%3A13%3A33.755Z",
          },
        ]
      `);
    });

    it('sets alert recovery context for recovered alerts', async () => {
      toISOStringSpy.mockImplementation(() => mockDate);
      const mockResultServiceProviderGetter: jest.Mock<{
        getAnomaliesTableData: jest.Mock<MockAnomalyResult>;
      }> = jest.fn();
      const mockGetAnomliesTableDataGetter: jest.Mock<MockAnomalyResult> = jest.fn();
      const mockGetLatestMonitorGetter: jest.Mock<Partial<Ping>> = jest.fn();

      mockGetLatestMonitorGetter.mockReturnValue(mockPing);
      mockGetAnomliesTableDataGetter.mockReturnValue(mockAnomaliesResult);
      mockResultServiceProviderGetter.mockReturnValue({
        getAnomaliesTableData: mockGetAnomliesTableDataGetter,
      });
      const { server, libs, plugins } = bootstrapDependencies(
        { getLatestMonitor: mockGetLatestMonitorGetter },
        {
          ml: {
            resultsServiceProvider: mockResultServiceProviderGetter,
          },
        }
      );
      const alert = durationAnomalyAlertFactory(server, libs, plugins);
      const options = mockOptions();
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(options);
      expect(options.setContext).toHaveBeenCalledTimes(2);
      mockRecoveredAlerts.forEach((alertState) => {
        expect(options.setContext).toHaveBeenCalledWith(alertState);
      });
    });
  });
});
