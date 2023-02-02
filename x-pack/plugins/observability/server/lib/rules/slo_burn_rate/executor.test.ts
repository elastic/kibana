/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/server';
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
import { FIRED_ACTION, getRuleExecutor } from './executor';
import { aStoredSLO, createSLO } from '../../../services/slo/fixtures/slo';
import { SLO } from '../../../domain/models';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import {
  BurnRateAlertState,
  BurnRateAlertContext,
  BurnRateAllowedActionGroups,
  BurnRateRuleParams,
  AlertStates,
} from './types';

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

const BURN_RATE_THRESHOLD = 2;
const BURN_RATE_ABOVE_THRESHOLD = BURN_RATE_THRESHOLD + 0.01;
const BURN_RATE_BELOW_THRESHOLD = BURN_RATE_THRESHOLD - 0.01;

describe('BurnRateRuleExecutor', () => {
  let esClientMock: ElasticsearchClientMock;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let loggerMock: jest.Mocked<MockedLogger>;
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
      alertFactory: alertFactoryMock,
      searchSourceClient: searchSourceClientMock,
      uiSettingsClient: uiSettingsClientMock,
      shouldWriteAlerts: jest.fn(),
      shouldStopExecution: jest.fn(),
      getAlertStartedDate: jest.fn(),
      getAlertUuid: jest.fn(),
      getAlertByAlertUuid: jest.fn(),
      share: {} as SharePluginStart,
      dataViews: dataViewPluginMocks.createStartContract(),
    };
  });

  it('does not schedule an alert when both windows burn rates are below the threshold', async () => {
    const slo = createSLO({ objective: { target: 0.9 } });
    soClientMock.get.mockResolvedValue(aStoredSLO(slo));
    esClientMock.search.mockResolvedValue(
      generateEsResponse(slo, BURN_RATE_BELOW_THRESHOLD, BURN_RATE_BELOW_THRESHOLD)
    );
    alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

    const executor = getRuleExecutor();
    await executor({
      params: someRuleParams({ sloId: slo.id, burnRateThreshold: BURN_RATE_THRESHOLD }),
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

  it('does not schedule an alert when the long window burn rate is below the threshold', async () => {
    const slo = createSLO({ objective: { target: 0.9 } });
    soClientMock.get.mockResolvedValue(aStoredSLO(slo));
    esClientMock.search.mockResolvedValue(
      generateEsResponse(slo, BURN_RATE_ABOVE_THRESHOLD, BURN_RATE_BELOW_THRESHOLD)
    );
    alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

    const executor = getRuleExecutor();
    await executor({
      params: someRuleParams({ sloId: slo.id, burnRateThreshold: BURN_RATE_THRESHOLD }),
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
    soClientMock.get.mockResolvedValue(aStoredSLO(slo));
    esClientMock.search.mockResolvedValue(
      generateEsResponse(slo, BURN_RATE_BELOW_THRESHOLD, BURN_RATE_ABOVE_THRESHOLD)
    );
    alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

    const executor = getRuleExecutor();
    await executor({
      params: someRuleParams({ sloId: slo.id, threshold: BURN_RATE_THRESHOLD }),
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

  it('schedules an alert when both windows burn rate have reached the threshold', async () => {
    const slo = createSLO({ objective: { target: 0.9 } });
    soClientMock.get.mockResolvedValue(aStoredSLO(slo));
    esClientMock.search.mockResolvedValue(
      generateEsResponse(slo, BURN_RATE_THRESHOLD, BURN_RATE_THRESHOLD)
    );
    const alertMock: Partial<Alert> = {
      scheduleActions: jest.fn(),
      replaceState: jest.fn(),
    };
    alertWithLifecycleMock.mockImplementation(() => alertMock as any);
    alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [] });

    const executor = getRuleExecutor();
    await executor({
      params: someRuleParams({ sloId: slo.id, burnRateThreshold: BURN_RATE_THRESHOLD }),
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
          'The burn rate for the past 1h is 2 and for the past 5m is 2. Alert when above 2 for both windows',
        [ALERT_EVALUATION_THRESHOLD]: 2,
        [ALERT_EVALUATION_VALUE]: 2,
      },
    });
    expect(alertMock.scheduleActions).toBeCalledWith(
      FIRED_ACTION.id,
      expect.objectContaining({
        longWindow: { burnRate: 2, duration: '1h' },
        shortWindow: { burnRate: 2, duration: '5m' },
        burnRateThreshold: 2,
        reason:
          'The burn rate for the past 1h is 2 and for the past 5m is 2. Alert when above 2 for both windows',
      })
    );
    expect(alertMock.replaceState).toBeCalledWith({ alertState: AlertStates.ALERT });
  });

  it('sets the context on the recovered alerts', async () => {
    const slo = createSLO({ objective: { target: 0.9 } });
    soClientMock.get.mockResolvedValue(aStoredSLO(slo));
    esClientMock.search.mockResolvedValue(
      generateEsResponse(slo, BURN_RATE_BELOW_THRESHOLD, BURN_RATE_ABOVE_THRESHOLD)
    );
    const alertMock: Partial<Alert> = {
      setContext: jest.fn(),
    };
    alertFactoryMock.done.mockReturnValueOnce({ getRecoveredAlerts: () => [alertMock] as any });

    const executor = getRuleExecutor();

    await executor({
      params: someRuleParams({ sloId: slo.id, burnRateThreshold: BURN_RATE_THRESHOLD }),
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
        longWindow: { burnRate: 2.01, duration: '1h' },
        shortWindow: { burnRate: 1.99, duration: '5m' },
        burnRateThreshold: 2,
      })
    );
  });
});

function someRuleParams(params: Partial<BurnRateRuleParams> = {}): BurnRateRuleParams {
  return {
    sloId: uuidv4(),
    burnRateThreshold: 2,
    maxBurnRateThreshold: 720,
    longWindow: { value: 1, unit: 'h' },
    shortWindow: { value: 5, unit: 'm' },
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
