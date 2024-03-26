/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IBasePath,
  IUiSettingsClient,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import {
  ElasticsearchClientMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { MockedLogger } from '@kbn/logging-mocks';
import { SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import { getRuleExecutor } from './executor';
import { createSLO } from '../../../services/fixtures/slo';
import { SLO, StoredSLO } from '../../../domain/models';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import {
  BurnRateAlertState,
  BurnRateAlertContext,
  BurnRateAllowedActionGroups,
  BurnRateRuleParams,
  AlertStates,
} from './types';
import { SLONotFound } from '../../../errors';
import { SO_SLO_TYPE } from '../../../saved_objects';
import { sloSchema } from '@kbn/slo-schema';
import {
  ALERT_ACTION,
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
} from '../../../../common/constants';
import { EvaluationBucket } from './lib/evaluate';
import {
  SLO_ID_FIELD,
  SLO_INSTANCE_ID_FIELD,
  SLO_REVISION_FIELD,
} from '../../../../common/field_names/slo';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import {
  generateAboveThresholdKey,
  generateBurnRateKey,
  generateStatsKey,
  generateWindowId,
  LONG_WINDOW,
  SHORT_WINDOW,
} from './lib/build_query';
import { get } from 'lodash';
import { ObservabilitySloAlert } from '@kbn/alerts-as-data-utils';
import { publicAlertsClientMock } from '@kbn/alerting-plugin/server/alerts_client/alerts_client.mock';

const commonEsResponse = {
  took: 100,
  timed_out: false,
  _shards: {
    total: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
  },
  hits: {
    hits: [],
  },
};

function createFindResponse(sloList: SLO[]): SavedObjectsFindResponse<StoredSLO> {
  return {
    page: 1,
    per_page: 25,
    total: sloList.length,
    saved_objects: sloList.map((slo) => ({
      id: slo.id,
      attributes: sloSchema.encode(slo),
      type: SO_SLO_TYPE,
      references: [],
      score: 1,
    })),
  };
}

function getTimeRange() {
  const date = new Date(Date.now()).toISOString();
  return { dateStart: date, dateEnd: date };
}

describe('BurnRateRuleExecutor', () => {
  let esClientMock: ElasticsearchClientMock;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let loggerMock: jest.Mocked<MockedLogger>;
  const basePathMock = { publicBaseUrl: 'https://kibana.dev' } as IBasePath;
  const alertsLocatorMock = {
    getLocation: jest.fn().mockImplementation(() => ({
      path: 'mockedAlertsLocator > getLocation',
    })),
  } as any as LocatorPublic<AlertsLocatorParams>;
  const ISO_DATE_REGEX =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/;

  let searchSourceClientMock: jest.Mocked<ISearchStartSearchSource>;
  let uiSettingsClientMock: jest.Mocked<IUiSettingsClient>;
  let servicesMock: jest.Mocked<
    RuleExecutorServices<
      BurnRateAlertState,
      BurnRateAlertContext,
      BurnRateAllowedActionGroups,
      ObservabilitySloAlert
    >
  >;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    soClientMock = savedObjectsClientMock.create();
    loggerMock = loggingSystemMock.createLogger();
    servicesMock = {
      savedObjectsClient: soClientMock,
      scopedClusterClient: { asCurrentUser: esClientMock, asInternalUser: esClientMock },
      alertsClient: publicAlertsClientMock.create(),
      alertFactory: {
        create: jest.fn(),
        done: jest.fn(),
        alertLimit: { getValue: jest.fn(), setLimitReached: jest.fn() },
      },
      searchSourceClient: searchSourceClientMock,
      uiSettingsClient: uiSettingsClientMock,
      shouldWriteAlerts: jest.fn(),
      shouldStopExecution: jest.fn(),
      share: {} as SharePluginStart,
      dataViews: dataViewPluginMocks.createStartContract(),
    };
  });

  describe('multi-window', () => {
    it('throws when the slo is not found', async () => {
      soClientMock.find.mockRejectedValue(new SLONotFound('SLO [non-existent] not found'));
      const executor = getRuleExecutor({ basePath: basePathMock });

      await expect(
        executor({
          params: someRuleParamsWithWindows({ sloId: 'non-existent' }),
          startedAt: new Date(),
          services: servicesMock,
          executionId: 'irrelevant',
          logger: loggerMock,
          previousStartedAt: null,
          rule: {} as SanitizedRuleConfig,
          spaceId: 'irrelevant',
          state: {},
          flappingSettings: DEFAULT_FLAPPING_SETTINGS,
          getTimeRange,
        })
      ).rejects.toThrowError();
    });

    it('returns early when the slo is disabled', async () => {
      const slo = createSLO({ objective: { target: 0.9 }, enabled: false });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const executor = getRuleExecutor({ basePath: basePathMock });

      const result = await executor({
        params: someRuleParamsWithWindows({ sloId: slo.id }),
        startedAt: new Date(),
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
      });

      expect(esClientMock.search).not.toHaveBeenCalled();
      expect(servicesMock.alertsClient!.report).not.toHaveBeenCalled();
      expect(servicesMock.alertsClient!.setAlertData).not.toHaveBeenCalled();
      expect(servicesMock.alertsClient!.getRecoveredAlerts).not.toHaveBeenCalled();
      expect(result).toEqual({ state: {} });
    });

    it('does not schedule an alert when long windows burn rates are below the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 0.9 },
            { shortWindowBurnRate: 1.2, longWindowBurnRate: 0.9 },
          ],
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 0.9 },
            { shortWindowBurnRate: 1.2, longWindowBurnRate: 0.9 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      const executor = getRuleExecutor({ basePath: basePathMock });
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
      });

      expect(servicesMock.alertsClient?.report).not.toBeCalled();
      expect(servicesMock.alertsClient?.setAlertData).not.toBeCalled();
    });

    it('does not schedule an alert when the short window burn rate is below the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 2.1 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 2.1 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      const executor = getRuleExecutor({ basePath: basePathMock });
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
      });

      expect(servicesMock.alertsClient?.report).not.toBeCalled();
      expect(servicesMock.alertsClient?.setAlertData).not.toBeCalled();
    });

    it('schedules an alert when both windows of first window definition burn rate have reached the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 2.1, longWindowBurnRate: 2.3 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 2.2, longWindowBurnRate: 2.5 },
            { shortWindowBurnRate: 0.9, longWindowBurnRate: 1.2 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      // @ts-ignore
      servicesMock.alertsClient!.report.mockImplementation(({ id }: { id: string }) => ({
        uuid: `uuid-${id}`,
        start: new Date().toISOString(),
      }));

      const executor = getRuleExecutor({
        basePath: basePathMock,
        alertsLocator: alertsLocatorMock,
      });

      await executor({
        params: ruleParams,
        startedAt: new Date(),
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
      });

      expect(servicesMock.alertsClient?.report).toBeCalledWith({
        id: 'foo',
        actionGroup: ALERT_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'CRITICAL: The burn rate for the past 1h is 2.3 and for the past 5m is 2.1 for foo. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2.1,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'foo',
        },
      });
      expect(servicesMock.alertsClient?.report).toBeCalledWith({
        id: 'bar',
        actionGroup: ALERT_ACTION.id,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'CRITICAL: The burn rate for the past 1h is 2.5 and for the past 5m is 2.2 for bar. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2.2,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'bar',
        },
      });
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(1, {
        id: 'foo',
        context: expect.objectContaining({
          longWindow: { burnRate: 2.3, duration: '1h' },
          shortWindow: { burnRate: 2.1, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'CRITICAL: The burn rate for the past 1h is 2.3 and for the past 5m is 2.1 for foo. Alert when above 2 for both windows',
          alertDetailsUrl: 'mockedAlertsLocator > getLocation',
        }),
      });
      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(2, {
        id: 'bar',
        context: expect.objectContaining({
          longWindow: { burnRate: 2.5, duration: '1h' },
          shortWindow: { burnRate: 2.2, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'CRITICAL: The burn rate for the past 1h is 2.5 and for the past 5m is 2.2 for bar. Alert when above 2 for both windows',
          alertDetailsUrl: 'mockedAlertsLocator > getLocation',
        }),
      });

      expect(alertsLocatorMock.getLocation).toBeCalledWith({
        baseUrl: 'https://kibana.dev',
        kuery: 'kibana.alert.uuid: "uuid-foo"',
        rangeFrom: expect.stringMatching(ISO_DATE_REGEX),
        spaceId: 'irrelevant',
      });
    });

    it('schedules an alert when both windows of second window definition burn rate have reached the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      const ruleParams = someRuleParamsWithWindows({ sloId: slo.id });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      const buckets = [
        {
          instanceId: 'foo',
          windows: [
            { shortWindowBurnRate: 1.0, longWindowBurnRate: 2.0 },
            { shortWindowBurnRate: 1.9, longWindowBurnRate: 1.2 },
          ],
        },
        {
          instanceId: 'bar',
          windows: [
            { shortWindowBurnRate: 1.0, longWindowBurnRate: 2.0 },
            { shortWindowBurnRate: 1.5, longWindowBurnRate: 1.1 },
          ],
        },
      ];
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, buckets, { instanceId: 'bar' })
      );
      esClientMock.search.mockResolvedValueOnce(
        generateEsResponse(ruleParams, [], { instanceId: 'bar' })
      );

      // @ts-ignore
      servicesMock.alertsClient!.report.mockImplementation(({ id }: { id: string }) => ({
        uuid: `uuid-${id}`,
        start: new Date().toISOString(),
      }));

      const executor = getRuleExecutor({ basePath: basePathMock });
      await executor({
        params: ruleParams,
        startedAt: new Date(),
        services: servicesMock,
        executionId: 'irrelevant',
        logger: loggerMock,
        previousStartedAt: null,
        rule: {} as SanitizedRuleConfig,
        spaceId: 'irrelevant',
        state: {},
        flappingSettings: DEFAULT_FLAPPING_SETTINGS,
        getTimeRange,
      });

      expect(servicesMock.alertsClient!.report).toBeCalledWith({
        id: 'foo',
        actionGroup: HIGH_PRIORITY_ACTION_ID,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'HIGH: The burn rate for the past 6h is 1.2 and for the past 30m is 1.9 for foo. Alert when above 1 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 1,
          [ALERT_EVALUATION_VALUE]: 1.2,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'foo',
        },
      });
      expect(servicesMock.alertsClient!.report).toBeCalledWith({
        id: 'bar',
        actionGroup: HIGH_PRIORITY_ACTION_ID,
        state: {
          alertState: AlertStates.ALERT,
        },
        payload: {
          [ALERT_REASON]:
            'HIGH: The burn rate for the past 6h is 1.1 and for the past 30m is 1.5 for bar. Alert when above 1 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 1,
          [ALERT_EVALUATION_VALUE]: 1.1,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
          [SLO_INSTANCE_ID_FIELD]: 'bar',
        },
      });

      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(1, {
        id: 'foo',
        context: expect.objectContaining({
          longWindow: { burnRate: 1.2, duration: '6h' },
          shortWindow: { burnRate: 1.9, duration: '30m' },
          burnRateThreshold: 1,
          reason:
            'HIGH: The burn rate for the past 6h is 1.2 and for the past 30m is 1.9 for foo. Alert when above 1 for both windows',
        }),
      });

      expect(servicesMock.alertsClient?.setAlertData).toHaveBeenNthCalledWith(2, {
        id: 'bar',
        context: expect.objectContaining({
          longWindow: { burnRate: 1.1, duration: '6h' },
          shortWindow: { burnRate: 1.5, duration: '30m' },
          burnRateThreshold: 1,
          reason:
            'HIGH: The burn rate for the past 6h is 1.1 and for the past 30m is 1.5 for bar. Alert when above 1 for both windows',
        }),
      });
    });
  });
});

function someRuleParamsWithWindows(params: Partial<BurnRateRuleParams> = {}): BurnRateRuleParams {
  return {
    sloId: uuidv4(),
    windows: [
      {
        id: uuidv4(),
        burnRateThreshold: 2,
        maxBurnRateThreshold: 720,
        longWindow: { value: 1, unit: 'h' },
        shortWindow: { value: 5, unit: 'm' },
        actionGroup: ALERT_ACTION_ID,
      },
      {
        id: uuidv4(),
        burnRateThreshold: 1,
        maxBurnRateThreshold: 720,
        longWindow: { value: 6, unit: 'h' },
        shortWindow: { value: 30, unit: 'm' },
        actionGroup: HIGH_PRIORITY_ACTION_ID,
      },
    ],
    ...params,
  };
}

interface ResponseBucket {
  instanceId: string;
  windows: Array<{
    shortWindowBurnRate: number;
    longWindowBurnRate: number;
  }>;
}

interface AfterKey {
  instanceId: string;
}

function generateEsResponse(
  params: BurnRateRuleParams,
  buckets: ResponseBucket[],
  afterKey: AfterKey
) {
  return {
    ...commonEsResponse,
    aggregations: {
      instances: {
        after: afterKey,
        doc_count: buckets.length ? 100 : 0,
        buckets: buckets
          .map((bucket) => {
            return bucket.windows.reduce(
              (acc, win, index) => ({
                ...acc,
                [generateStatsKey(generateWindowId(index), SHORT_WINDOW)]: {
                  doc_count: 100,
                  good: { value: win.shortWindowBurnRate * 100 },
                  total: { value: 100 },
                },
                [generateStatsKey(generateWindowId(index), LONG_WINDOW)]: {
                  doc_count: 100,
                  good: { value: win.longWindowBurnRate * 100 },
                  total: { value: 100 },
                },
                [generateBurnRateKey(generateWindowId(index), SHORT_WINDOW)]: {
                  value: win.shortWindowBurnRate,
                },
                [generateBurnRateKey(generateWindowId(index), LONG_WINDOW)]: {
                  value: win.longWindowBurnRate,
                },
                [generateAboveThresholdKey(generateWindowId(index), SHORT_WINDOW)]: {
                  value: win.shortWindowBurnRate >= params.windows[index].burnRateThreshold ? 1 : 0,
                },
                [generateAboveThresholdKey(generateWindowId(index), LONG_WINDOW)]: {
                  value: win.longWindowBurnRate >= params.windows[index].burnRateThreshold ? 1 : 0,
                },
              }),
              {
                key: { instanceId: bucket.instanceId },
                doc_count: 100,
              } as EvaluationBucket
            );
          })
          .filter((bucket: any) =>
            params.windows.some(
              (_win, index) =>
                get(
                  bucket,
                  [generateAboveThresholdKey(generateWindowId(index), SHORT_WINDOW), 'value'],
                  0
                ) === 1 &&
                get(
                  bucket,
                  [generateAboveThresholdKey(generateWindowId(index), LONG_WINDOW), 'value'],
                  0
                ) === 1
            )
          ),
      },
    },
  };
}
