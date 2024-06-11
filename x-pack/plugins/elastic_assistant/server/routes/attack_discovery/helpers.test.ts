/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AuthenticatedUser } from '@kbn/core-security-common';
import moment from 'moment';
import { waitFor } from '@testing-library/react';
import {
  REQUIRED_FOR_ATTACK_DISCOVERY,
  addGenerationInterval,
  attackDiscoveryStatus,
  getAssistantToolParams,
  handleToolError,
  updateAttackDiscoveryStatusToRunning,
  updateAttackDiscoveries,
} from './helpers';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { AttackDiscoveryDataClient } from '../../ai_assistant_data_clients/attack_discovery';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { KibanaRequest } from '@kbn/core-http-server';
import {
  AttackDiscoveryPostRequestBody,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import { coreMock } from '@kbn/core/server/mocks';

jest.mock('lodash/fp', () => ({
  uniq: jest.fn((arr) => Array.from(new Set(arr))),
}));

jest.mock('@kbn/securitysolution-es-utils', () => ({
  transformError: jest.fn((err) => err),
}));
jest.mock('@kbn/langchain/server', () => ({
  ActionsClientLlm: jest.fn(),
}));
jest.mock('../evaluate/utils', () => ({
  getLangSmithTracer: jest.fn().mockReturnValue([]),
}));
jest.mock('../utils', () => ({
  getLlmType: jest.fn().mockReturnValue('llm-type'),
}));
const findAttackDiscoveryByConnectorId = jest.fn();
const updateAttackDiscovery = jest.fn();
const createAttackDiscovery = jest.fn();
const mockDataClient = {
  findAttackDiscoveryByConnectorId,
  updateAttackDiscovery,
  createAttackDiscovery,
} as unknown as AttackDiscoveryDataClient;
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();
const mockTelemetry = coreMock.createSetup().analytics;
const mockAuthenticatedUser = {
  username: 'user',
  profile_uid: '1234',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
const mockApiConfig = {
  connectorId: 'connector-id',
  actionTypeId: '.bedrock',
  model: 'model',
  provider: OpenAiProviderType.OpenAi,
};
describe('helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('getAssistantToolParams', () => {
    const mockParams = {
      actions: {} as unknown as ActionsPluginStart,
      alertsIndexPattern: 'alerts-*',
      anonymizationFields: [{ id: '1', field: 'field1', allowed: true, anonymized: true }],
      apiConfig: mockApiConfig,
      esClient: mockEsClient,
      connectorTimeout: 1000,
      langChainTimeout: 2000,
      langSmithProject: 'project',
      langSmithApiKey: 'api-key',
      logger: mockLogger,
      latestReplacements: {},
      onNewReplacements: jest.fn(),
      request: {} as KibanaRequest<
        unknown,
        unknown,
        ExecuteConnectorRequestBody | AttackDiscoveryPostRequestBody
      >,
      size: 10,
    };

    it('should return formatted assistant tool params', () => {
      const result = getAssistantToolParams(mockParams);

      expect(ActionsClientLlm).toHaveBeenCalledWith(
        expect.objectContaining({
          connectorId: 'connector-id',
          llmType: 'llm-type',
        })
      );
      expect(result.anonymizationFields).toEqual([
        ...mockParams.anonymizationFields,
        ...REQUIRED_FOR_ATTACK_DISCOVERY,
      ]);
    });
  });

  describe('addGenerationInterval', () => {
    const generationInterval = { date: '2024-01-01T00:00:00Z', durationMs: 1000 };
    const existingIntervals = [
      { date: '2024-01-02T00:00:00Z', durationMs: 2000 },
      { date: '2024-01-03T00:00:00Z', durationMs: 3000 },
    ];

    it('should add new interval and maintain length within MAX_GENERATION_INTERVALS', () => {
      const result = addGenerationInterval(existingIntervals, generationInterval);
      expect(result.length).toBeLessThanOrEqual(5);
      expect(result).toContain(generationInterval);
    });

    it('should remove the oldest interval if exceeding MAX_GENERATION_INTERVALS', () => {
      const longExistingIntervals = [...Array(5)].map((_, i) => ({
        date: `2024-01-0${i + 2}T00:00:00Z`,
        durationMs: (i + 2) * 1000,
      }));
      const result = addGenerationInterval(longExistingIntervals, generationInterval);
      expect(result.length).toBe(5);
      expect(result).not.toContain(longExistingIntervals[4]);
    });
  });

  describe('updateAttackDiscoveryStatusToRunning', () => {
    it('should update existing attack discovery to running', async () => {
      const existingAd = { id: 'existing-id', backingIndex: 'index' };
      findAttackDiscoveryByConnectorId.mockResolvedValue(existingAd);
      updateAttackDiscovery.mockResolvedValue(existingAd);

      const result = await updateAttackDiscoveryStatusToRunning(
        mockDataClient,
        mockAuthenticatedUser,
        mockApiConfig
      );

      expect(findAttackDiscoveryByConnectorId).toHaveBeenCalledWith({
        connectorId: mockApiConfig.connectorId,
        authenticatedUser: mockAuthenticatedUser,
      });
      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: expect.objectContaining({
          status: attackDiscoveryStatus.running,
        }),
        authenticatedUser: mockAuthenticatedUser,
      });
      expect(result).toEqual({ attackDiscoveryId: existingAd.id, currentAd: existingAd });
    });

    it('should create a new attack discovery if none exists', async () => {
      const newAd = { id: 'new-id', backingIndex: 'index' };
      findAttackDiscoveryByConnectorId.mockResolvedValue(null);
      createAttackDiscovery.mockResolvedValue(newAd);

      const result = await updateAttackDiscoveryStatusToRunning(
        mockDataClient,
        mockAuthenticatedUser,
        mockApiConfig
      );

      expect(createAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryCreate: expect.objectContaining({
          status: attackDiscoveryStatus.running,
        }),
        authenticatedUser: mockAuthenticatedUser,
      });
      expect(result).toEqual({ attackDiscoveryId: newAd.id, currentAd: newAd });
    });

    it('should throw an error if updating or creating attack discovery fails', async () => {
      findAttackDiscoveryByConnectorId.mockResolvedValue(null);
      createAttackDiscovery.mockResolvedValue(null);

      await expect(
        updateAttackDiscoveryStatusToRunning(mockDataClient, mockAuthenticatedUser, mockApiConfig)
      ).rejects.toThrow('Could not create attack discovery for connectorId: connector-id');
    });
  });

  describe('updateAttackDiscoveries', () => {
    const mockAttackDiscoveryId = 'attack-discovery-id';
    const mockCurrentAd = {
      id: 'existing-id',
      backingIndex: 'attack-discovery-index',
      timestamp: '2024-06-07T18:56:17.357Z',
      createdAt: '2024-06-07T18:56:17.357Z',
      users: [
        {
          id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
          name: 'elastic',
        },
      ],
      apiConfig: mockApiConfig,
      updatedAt: '2024-06-07T21:19:08.090Z',
      replacements: {
        'f19e1a0a-de3b-496c-8ace-dd91229e1084': 'root',
      },
      namespace: 'default',
      attackDiscoveries: [],
      status: attackDiscoveryStatus.running,
      generationIntervals: [
        {
          date: '2024-06-07T21:19:08.089Z',
          durationMs: 110906,
        },
        {
          date: '2024-06-07T20:04:35.715Z',
          durationMs: 104593,
        },
        {
          date: '2024-06-07T18:58:27.880Z',
          durationMs: 130526,
        },
      ],
      alertsContextCount: 20,
      averageIntervalMs: 115341,
    };
    const mockLatestReplacements = {};
    const mockRawAttackDiscoveries = JSON.stringify({
      alertsContextCount: 5,
      attackDiscoveries: [{ alertIds: ['alert-1', 'alert-2'] }, { alertIds: ['alert-3'] }],
    });
    const mockSize = 10;
    const date = '2024-03-28T22:27:28.000Z';
    const mockStartTime = moment('2024-03-28T22:25:28.000Z');
    beforeAll(() => {
      jest.useFakeTimers();
    });

    beforeEach(() => {
      jest.setSystemTime(new Date(date));
      updateAttackDiscovery.mockResolvedValue({});
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should update attack discoveries and report success telemetry', async () => {
      updateAttackDiscoveries({
        apiConfig: mockApiConfig,
        attackDiscoveryId: mockAttackDiscoveryId,
        authenticatedUser: mockAuthenticatedUser,
        currentAd: mockCurrentAd,
        dataClient: mockDataClient,
        latestReplacements: mockLatestReplacements,
        rawAttackDiscoveries: mockRawAttackDiscoveries,
        size: mockSize,
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: {
          alertsContextCount: 5,
          attackDiscoveries: [{ alertIds: ['alert-1', 'alert-2'] }, { alertIds: ['alert-3'] }],
          status: attackDiscoveryStatus.succeeded,
          id: mockAttackDiscoveryId,
          replacements: mockLatestReplacements,
          backingIndex: mockCurrentAd.backingIndex,
          generationIntervals: [{ date, durationMs: 120000 }, ...mockCurrentAd.generationIntervals],
        },
        authenticatedUser: mockAuthenticatedUser,
      });
      await waitFor(() => {
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
          actionTypeId: mockApiConfig.actionTypeId,
          alertsContextCount: 5,
          alertsCount: 3,
          configuredAlertsCount: mockSize,
          discoveriesGenerated: 2,
          durationMs: 120000,
          model: mockApiConfig.model,
          provider: mockApiConfig.provider,
        });
      });
    });

    it('should update attack discoveries without generation interval if no discoveries are found', async () => {
      const noDiscoveriesRaw = JSON.stringify({
        alertsContextCount: 0,
        attackDiscoveries: [],
      });

      updateAttackDiscoveries({
        apiConfig: mockApiConfig,
        attackDiscoveryId: mockAttackDiscoveryId,
        authenticatedUser: mockAuthenticatedUser,
        currentAd: mockCurrentAd,
        dataClient: mockDataClient,
        latestReplacements: mockLatestReplacements,
        rawAttackDiscoveries: noDiscoveriesRaw,
        size: mockSize,
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      });

      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: {
          alertsContextCount: 0,
          attackDiscoveries: [],
          status: attackDiscoveryStatus.succeeded,
          id: mockAttackDiscoveryId,
          replacements: mockLatestReplacements,
          backingIndex: mockCurrentAd.backingIndex,
        },
        authenticatedUser: mockAuthenticatedUser,
      });

      await waitFor(() => {
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_success', {
          actionTypeId: mockApiConfig.actionTypeId,
          alertsContextCount: 0,
          alertsCount: 0,
          configuredAlertsCount: mockSize,
          discoveriesGenerated: 0,
          durationMs: 120000,
          model: mockApiConfig.model,
          provider: mockApiConfig.provider,
        });
      });
    });

    it('should throw an error if raw attack discoveries is null', async () => {
      await expect(
        new Promise((resolve, reject) => {
          try {
            updateAttackDiscoveries({
              apiConfig: mockApiConfig,
              attackDiscoveryId: mockAttackDiscoveryId,
              authenticatedUser: mockAuthenticatedUser,
              currentAd: mockCurrentAd,
              dataClient: mockDataClient,
              latestReplacements: mockLatestReplacements,
              rawAttackDiscoveries: null,
              size: mockSize,
              startTime: mockStartTime,
              telemetry: mockTelemetry,
            });
            resolve(true);
          } catch (error) {
            reject(error);
          }
        })
      ).rejects.toThrow('tool returned no attack discoveries');
    });
  });

  describe('handleToolError', () => {
    const mockError = new Error('Test error');

    const params = {
      apiConfig: mockApiConfig,
      attackDiscoveryId: 'discovery-id',
      authenticatedUser: mockAuthenticatedUser,
      backingIndex: 'backing-index',
      dataClient: mockDataClient,
      err: mockError,
      latestReplacements: {},
      logger: mockLogger,
      telemetry: mockTelemetry,
    };

    it('should log the error and update attack discovery status to failed', async () => {
      await handleToolError(params);

      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
      expect(updateAttackDiscovery).toHaveBeenCalledWith({
        attackDiscoveryUpdateProps: expect.objectContaining({
          status: attackDiscoveryStatus.failed,
        }),
        authenticatedUser: params.authenticatedUser,
      });
      expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
        actionTypeId: params.apiConfig.actionTypeId,
        errorMessage: mockError.message,
        model: params.apiConfig.model,
        provider: params.apiConfig.provider,
      });
    });
  });
});
