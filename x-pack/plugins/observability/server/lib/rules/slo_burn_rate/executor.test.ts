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
import { LifecycleAlertService, LifecycleAlertServices } from '@kbn/rule-registry-plugin/server';
import { PublicAlertFactory } from '@kbn/alerting-plugin/server/alert/create_alert_factory';
import { ISearchStartSearchSource } from '@kbn/data-plugin/public';
import { MockedLogger } from '@kbn/logging-mocks';
import { SanitizedRuleConfig } from '@kbn/alerting-plugin/common';
import { Alert, RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common/rules_settings';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { LocatorPublic } from '@kbn/share-plugin/common';
import type { AlertsLocatorParams } from '../../../../common';
import { getRuleExecutor } from './executor';
import { createSLO } from '../../../services/slo/fixtures/slo';
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
import { SLO_ID_FIELD, SLO_REVISION_FIELD } from '../../../../common/field_names/slo';
import { SLONotFound } from '../../../errors';
import { SO_SLO_TYPE } from '../../../saved_objects';
import { sloSchema } from '@kbn/slo-schema';
import {
  ALERT_ACTION,
  ALERT_ACTION_ID,
  HIGH_PRIORITY_ACTION_ID,
} from '../../../../common/constants';

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

describe('BurnRateRuleExecutor', () => {
  let esClientMock: ElasticsearchClientMock;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let loggerMock: jest.Mocked<MockedLogger>;
  const alertUuid = 'mockedAlertUuid';
  const basePathMock = { publicBaseUrl: 'https://kibana.dev' } as IBasePath;
  const alertsLocatorMock = {
    getLocation: jest.fn().mockImplementation(() => ({
      path: 'mockedAlertsLocator > getLocation',
    })),
  } as any as LocatorPublic<AlertsLocatorParams>;
  const ISO_DATE_REGEX =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/;
  let alertWithLifecycleMock: jest.MockedFn<LifecycleAlertService>;
  let alertFactoryMock: jest.Mocked<
    PublicAlertFactory<BurnRateAlertState, BurnRateAlertContext, BurnRateAllowedActionGroups>
  >;
  let searchSourceClientMock: jest.Mocked<ISearchStartSearchSource>;
  let uiSettingsClientMock: jest.Mocked<IUiSettingsClient>;
  let servicesMock: RuleExecutorServices<
    BurnRateAlertState,
    BurnRateAlertContext,
    BurnRateAllowedActionGroups
  > &
    LifecycleAlertServices<BurnRateAlertState, BurnRateAlertContext, BurnRateAllowedActionGroups>;

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    soClientMock = savedObjectsClientMock.create();
    alertWithLifecycleMock = jest.fn();
    alertFactoryMock = {
      create: jest.fn(),
      done: jest.fn(),
      alertLimit: { getValue: jest.fn(), setLimitReached: jest.fn() },
    };
    loggerMock = loggingSystemMock.createLogger();
    servicesMock = {
      alertWithLifecycle: alertWithLifecycleMock,
      savedObjectsClient: soClientMock,
      scopedClusterClient: { asCurrentUser: esClientMock, asInternalUser: esClientMock },
      alertsClient: null,
      alertFactory: alertFactoryMock,
      searchSourceClient: searchSourceClientMock,
      uiSettingsClient: uiSettingsClientMock,
      shouldWriteAlerts: jest.fn(),
      shouldStopExecution: jest.fn(),
      getAlertStartedDate: jest.fn(),
      getAlertUuid: jest.fn().mockImplementation(() => alertUuid),
      getAlertByAlertUuid: jest.fn(),
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
      });

      expect(esClientMock.search).not.toHaveBeenCalled();
      expect(alertWithLifecycleMock).not.toHaveBeenCalled();
      expect(alertFactoryMock.done).not.toHaveBeenCalled();
      expect(result).toEqual({ state: {} });
    });

    it('does not schedule an alert when long windows burn rates are below the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      esClientMock.search.mockResolvedValueOnce(generateEsResponse(slo, 2.1, 1.9));
      esClientMock.search.mockResolvedValueOnce(generateEsResponse(slo, 1.1, 0.9));
      alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

      const executor = getRuleExecutor({ basePath: basePathMock });
      await executor({
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
      });

      expect(alertWithLifecycleMock).not.toBeCalled();
    });

    it('does not schedule an alert when the short window burn rate is below the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 1.9, 2.1));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 0.9, 1.1));
      alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

      const executor = getRuleExecutor({ basePath: basePathMock });
      await executor({
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
      });

      expect(alertWithLifecycleMock).not.toBeCalled();
    });

    it('schedules an alert when both windows of first window definition burn rate have reached the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 2, 2));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 2, 2));
      const alertMock: Partial<Alert> = {
        scheduleActions: jest.fn(),
        replaceState: jest.fn(),
      };
      alertWithLifecycleMock.mockImplementation(() => alertMock as any);
      alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

      const executor = getRuleExecutor({
        basePath: basePathMock,
        alertsLocator: alertsLocatorMock,
      });
      await executor({
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
      });

      expect(alertWithLifecycleMock).toBeCalledWith({
        id: `alert-${slo.id}-${slo.revision}`,
        fields: {
          [ALERT_REASON]:
            'CRITICAL: The burn rate for the past 1h is 2 and for the past 5m is 2. Alert when above 2 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 2,
          [ALERT_EVALUATION_VALUE]: 2,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
        },
      });
      expect(alertMock.scheduleActions).toBeCalledWith(
        ALERT_ACTION.id,
        expect.objectContaining({
          longWindow: { burnRate: 2, duration: '1h' },
          shortWindow: { burnRate: 2, duration: '5m' },
          burnRateThreshold: 2,
          reason:
            'CRITICAL: The burn rate for the past 1h is 2 and for the past 5m is 2. Alert when above 2 for both windows',
          alertDetailsUrl: 'mockedAlertsLocator > getLocation',
        })
      );
      expect(alertMock.replaceState).toBeCalledWith({ alertState: AlertStates.ALERT });
      expect(alertsLocatorMock.getLocation).toBeCalledWith({
        baseUrl: 'https://kibana.dev',
        kuery: 'kibana.alert.uuid: "mockedAlertUuid"',
        rangeFrom: expect.stringMatching(ISO_DATE_REGEX),
        spaceId: 'irrelevant',
      });
    });

    it('schedules an alert when both windows of second window definition burn rate have reached the threshold', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 1.5, 1.5));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 1.5, 1.5));
      const alertMock: Partial<Alert> = {
        scheduleActions: jest.fn(),
        replaceState: jest.fn(),
      };
      alertWithLifecycleMock.mockImplementation(() => alertMock as any);
      alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

      const executor = getRuleExecutor({ basePath: basePathMock });
      await executor({
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
      });

      expect(alertWithLifecycleMock).toBeCalledWith({
        id: `alert-${slo.id}-${slo.revision}`,
        fields: {
          [ALERT_REASON]:
            'HIGH: The burn rate for the past 6h is 1.5 and for the past 30m is 1.5. Alert when above 1 for both windows',
          [ALERT_EVALUATION_THRESHOLD]: 1,
          [ALERT_EVALUATION_VALUE]: 1.5,
          [SLO_ID_FIELD]: slo.id,
          [SLO_REVISION_FIELD]: slo.revision,
        },
      });
      expect(alertMock.scheduleActions).toBeCalledWith(
        HIGH_PRIORITY_ACTION_ID,
        expect.objectContaining({
          longWindow: { burnRate: 1.5, duration: '6h' },
          shortWindow: { burnRate: 1.5, duration: '30m' },
          burnRateThreshold: 1,
          reason:
            'HIGH: The burn rate for the past 6h is 1.5 and for the past 30m is 1.5. Alert when above 1 for both windows',
        })
      );
      expect(alertMock.replaceState).toBeCalledWith({ alertState: AlertStates.ALERT });
    });

    it('sets the context on the recovered alerts using the last window', async () => {
      const slo = createSLO({ objective: { target: 0.9 } });
      soClientMock.find.mockResolvedValueOnce(createFindResponse([slo]));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 0.9, 0.9));
      esClientMock.search.mockResolvedValue(generateEsResponse(slo, 0.9, 0.9));
      const alertMock: Partial<Alert> = {
        setContext: jest.fn(),
      };
      alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [alertMock] as any });

      const executor = getRuleExecutor({
        basePath: basePathMock,
        alertsLocator: alertsLocatorMock,
      });

      await executor({
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
      });

      expect(alertWithLifecycleMock).not.toBeCalled();
      expect(alertMock.setContext).toBeCalledWith(
        expect.objectContaining({
          longWindow: { burnRate: 0.9, duration: '6h' },
          shortWindow: { burnRate: 0.9, duration: '30m' },
          burnRateThreshold: 1,
          alertDetailsUrl: 'mockedAlertsLocator > getLocation',
        })
      );
      expect(alertsLocatorMock.getLocation).toBeCalledWith({
        baseUrl: 'https://kibana.dev',
        kuery: 'kibana.alert.uuid: "mockedAlertUuid"',
        rangeFrom: expect.stringMatching(ISO_DATE_REGEX),
        spaceId: 'irrelevant',
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

function generateEsResponse(slo: SLO, shortWindowBurnRate: number, longWindowBurnRate: number) {
  return {
    ...commonEsResponse,
    aggregations: {
      SHORT_WINDOW: { buckets: [generateBucketForBurnRate(slo, shortWindowBurnRate)] },
      LONG_WINDOW: { buckets: [generateBucketForBurnRate(slo, longWindowBurnRate)] },
    },
  };
}

function generateBucketForBurnRate(slo: SLO, burnRate: number) {
  const total = 100;
  const good = total * (1 - burnRate + slo.objective.target * burnRate);
  return { good: { value: good }, total: { value: total } };
}
