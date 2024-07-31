/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '@kbn/core-security-common';
import moment from 'moment';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';

import {
  REQUIRED_FOR_ATTACK_DISCOVERY,
  addGenerationInterval,
  attackDiscoveryStatus,
  getAssistantToolParams,
  handleToolError,
  updateAttackDiscoveryStatusToCanceled,
  updateAttackDiscoveryStatusToRunning,
  updateAttackDiscoveries,
  getAttackDiscoveryStats,
} from './helpers';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { AttackDiscoveryDataClient } from '../../ai_assistant_data_clients/attack_discovery';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { KibanaRequest } from '@kbn/core-http-server';
import {
  AttackDiscoveryPostRequestBody,
  ExecuteConnectorRequestBody,
} from '@kbn/elastic-assistant-common';
import { coreMock } from '@kbn/core/server/mocks';
import { transformESSearchToAttackDiscovery } from '../../ai_assistant_data_clients/attack_discovery/transforms';
import { getAttackDiscoverySearchEsMock } from '../../__mocks__/attack_discovery_schema.mock';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import {
  getAnonymizationFieldMock,
  getUpdateAnonymizationFieldSchemaMock,
} from '../../__mocks__/anonymization_fields_schema.mock';

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
const getAttackDiscovery = jest.fn();
const findAllAttackDiscoveries = jest.fn();
const mockDataClient = {
  findAttackDiscoveryByConnectorId,
  updateAttackDiscovery,
  createAttackDiscovery,
  getAttackDiscovery,
  findAllAttackDiscoveries,
} as unknown as AttackDiscoveryDataClient;
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();
const mockTelemetry = coreMock.createSetup().analytics;
const mockError = new Error('Test error');

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

const mockCurrentAd = transformESSearchToAttackDiscovery(getAttackDiscoverySearchEsMock())[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRequest: KibanaRequest<unknown, unknown, any, any> = {} as unknown as KibanaRequest<
  unknown,
  unknown,
  any, // eslint-disable-line @typescript-eslint/no-explicit-any
  any // eslint-disable-line @typescript-eslint/no-explicit-any
>;

describe('helpers', () => {
  const date = '2024-03-28T22:27:28.000Z';
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    jest.setSystemTime(new Date(date));
    getAttackDiscovery.mockResolvedValue(mockCurrentAd);
    updateAttackDiscovery.mockResolvedValue({});
  });
  describe('getAssistantToolParams', () => {
    const alertsIndexPattern = '.alerts-security.alerts-default';
    const esClient = elasticsearchClientMock.createElasticsearchClient();
    const actionsClient = actionsClientMock.create();
    const langChainTimeout = 1000;
    const latestReplacements = {};
    const llm = new ActionsClientLlm({
      actionsClient,
      connectorId: 'test-connecter-id',
      llmType: 'bedrock',
      logger: mockLogger,
      temperature: 0,
      timeout: 580000,
    });
    const onNewReplacements = jest.fn();
    const size = 20;

    const mockParams = {
      actionsClient,
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

    it('returns the expected AssistantToolParams when anonymizationFields are provided', () => {
      const anonymizationFields = [
        getAnonymizationFieldMock(getUpdateAnonymizationFieldSchemaMock()),
      ];

      const result = getAssistantToolParams({
        actionsClient,
        alertsIndexPattern,
        apiConfig: mockApiConfig,
        anonymizationFields,
        connectorTimeout: 1000,
        latestReplacements,
        esClient,
        langChainTimeout,
        logger: mockLogger,
        onNewReplacements,
        request: mockRequest,
        size,
      });

      expect(result).toEqual({
        alertsIndexPattern,
        anonymizationFields: [...anonymizationFields, ...REQUIRED_FOR_ATTACK_DISCOVERY],
        isEnabledKnowledgeBase: false,
        chain: undefined,
        esClient,
        langChainTimeout,
        llm,
        logger: mockLogger,
        modelExists: false,
        onNewReplacements,
        replacements: latestReplacements,
        request: mockRequest,
        size,
      });
    });

    it('returns the expected AssistantToolParams when anonymizationFields is undefined', () => {
      const anonymizationFields = undefined;

      const result = getAssistantToolParams({
        actionsClient,
        alertsIndexPattern,
        apiConfig: mockApiConfig,
        anonymizationFields,
        connectorTimeout: 1000,
        latestReplacements,
        esClient,
        langChainTimeout,
        logger: mockLogger,
        onNewReplacements,
        request: mockRequest,
        size,
      });

      expect(result).toEqual({
        alertsIndexPattern,
        anonymizationFields: [...REQUIRED_FOR_ATTACK_DISCOVERY],
        isEnabledKnowledgeBase: false,
        chain: undefined,
        esClient,
        langChainTimeout,
        llm,
        logger: mockLogger,
        modelExists: false,
        onNewReplacements,
        replacements: latestReplacements,
        request: mockRequest,
        size,
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

    describe('updateAttackDiscoveryStatusToCanceled', () => {
      const existingAd = {
        id: 'existing-id',
        backingIndex: 'index',
        status: attackDiscoveryStatus.running,
      };
      it('should update existing attack discovery to canceled', async () => {
        findAttackDiscoveryByConnectorId.mockResolvedValue(existingAd);
        updateAttackDiscovery.mockResolvedValue(existingAd);

        const result = await updateAttackDiscoveryStatusToCanceled(
          mockDataClient,
          mockAuthenticatedUser,
          mockApiConfig.connectorId
        );

        expect(findAttackDiscoveryByConnectorId).toHaveBeenCalledWith({
          connectorId: mockApiConfig.connectorId,
          authenticatedUser: mockAuthenticatedUser,
        });
        expect(updateAttackDiscovery).toHaveBeenCalledWith({
          attackDiscoveryUpdateProps: expect.objectContaining({
            status: attackDiscoveryStatus.canceled,
          }),
          authenticatedUser: mockAuthenticatedUser,
        });
        expect(result).toEqual(existingAd);
      });

      it('should throw an error if attack discovery is not running', async () => {
        findAttackDiscoveryByConnectorId.mockResolvedValue({
          ...existingAd,
          status: attackDiscoveryStatus.succeeded,
        });
        await expect(
          updateAttackDiscoveryStatusToCanceled(
            mockDataClient,
            mockAuthenticatedUser,
            mockApiConfig.connectorId
          )
        ).rejects.toThrow(
          'Connector id connector-id does not have a running attack discovery, and therefore cannot be canceled.'
        );
      });

      it('should throw an error if attack discovery does not exist', async () => {
        findAttackDiscoveryByConnectorId.mockResolvedValue(null);
        await expect(
          updateAttackDiscoveryStatusToCanceled(
            mockDataClient,
            mockAuthenticatedUser,
            mockApiConfig.connectorId
          )
        ).rejects.toThrow('Could not find attack discovery for connector id: connector-id');
      });
      it('should throw error if updateAttackDiscovery returns null', async () => {
        findAttackDiscoveryByConnectorId.mockResolvedValue(existingAd);
        updateAttackDiscovery.mockResolvedValue(null);

        await expect(
          updateAttackDiscoveryStatusToCanceled(
            mockDataClient,
            mockAuthenticatedUser,
            mockApiConfig.connectorId
          )
        ).rejects.toThrow('Could not update attack discovery for connector id: connector-id');
      });
    });

    describe('updateAttackDiscoveries', () => {
      const mockAttackDiscoveryId = 'attack-discovery-id';
      const mockLatestReplacements = {};
      const mockRawAttackDiscoveries = JSON.stringify({
        alertsContextCount: 5,
        attackDiscoveries: [{ alertIds: ['alert-1', 'alert-2'] }, { alertIds: ['alert-3'] }],
      });
      const mockSize = 10;
      const mockStartTime = moment('2024-03-28T22:25:28.000Z');

      const mockArgs = {
        apiConfig: mockApiConfig,
        attackDiscoveryId: mockAttackDiscoveryId,
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
        latestReplacements: mockLatestReplacements,
        logger: mockLogger,
        rawAttackDiscoveries: mockRawAttackDiscoveries,
        size: mockSize,
        startTime: mockStartTime,
        telemetry: mockTelemetry,
      };

      it('should update attack discoveries and report success telemetry', async () => {
        await updateAttackDiscoveries(mockArgs);

        expect(updateAttackDiscovery).toHaveBeenCalledWith({
          attackDiscoveryUpdateProps: {
            alertsContextCount: 5,
            attackDiscoveries: [{ alertIds: ['alert-1', 'alert-2'] }, { alertIds: ['alert-3'] }],
            status: attackDiscoveryStatus.succeeded,
            id: mockAttackDiscoveryId,
            replacements: mockLatestReplacements,
            backingIndex: mockCurrentAd.backingIndex,
            generationIntervals: [
              { date, durationMs: 120000 },
              ...mockCurrentAd.generationIntervals,
            ],
          },
          authenticatedUser: mockAuthenticatedUser,
        });

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

      it('should update attack discoveries without generation interval if no discoveries are found', async () => {
        const noDiscoveriesRaw = JSON.stringify({
          alertsContextCount: 0,
          attackDiscoveries: [],
        });

        await updateAttackDiscoveries({
          ...mockArgs,
          rawAttackDiscoveries: noDiscoveriesRaw,
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

      it('should catch and log an error if raw attack discoveries is null', async () => {
        await updateAttackDiscoveries({
          ...mockArgs,
          rawAttackDiscoveries: null,
        });
        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
          actionTypeId: mockArgs.apiConfig.actionTypeId,
          errorMessage: 'tool returned no attack discoveries',
          model: mockArgs.apiConfig.model,
          provider: mockArgs.apiConfig.provider,
        });
      });

      it('should return and not call updateAttackDiscovery when getAttackDiscovery returns a canceled response', async () => {
        getAttackDiscovery.mockResolvedValue({
          ...mockCurrentAd,
          status: attackDiscoveryStatus.canceled,
        });
        await updateAttackDiscoveries(mockArgs);

        expect(mockLogger.error).not.toHaveBeenCalled();
        expect(updateAttackDiscovery).not.toHaveBeenCalled();
      });

      it('should log the error and report telemetry when getAttackDiscovery rejects', async () => {
        getAttackDiscovery.mockRejectedValue(mockError);
        await updateAttackDiscoveries(mockArgs);

        expect(mockLogger.error).toHaveBeenCalledWith(mockError);
        expect(updateAttackDiscovery).not.toHaveBeenCalled();
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
          actionTypeId: mockArgs.apiConfig.actionTypeId,
          errorMessage: mockError.message,
          model: mockArgs.apiConfig.model,
          provider: mockArgs.apiConfig.provider,
        });
      });
    });

    describe('handleToolError', () => {
      const mockArgs = {
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
        await handleToolError(mockArgs);

        expect(mockLogger.error).toHaveBeenCalledWith(mockError);
        expect(updateAttackDiscovery).toHaveBeenCalledWith({
          attackDiscoveryUpdateProps: {
            status: attackDiscoveryStatus.failed,
            attackDiscoveries: [],
            backingIndex: 'foo',
            failureReason: 'Test error',
            id: 'discovery-id',
            replacements: {},
          },
          authenticatedUser: mockArgs.authenticatedUser,
        });
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
          actionTypeId: mockArgs.apiConfig.actionTypeId,
          errorMessage: mockError.message,
          model: mockArgs.apiConfig.model,
          provider: mockArgs.apiConfig.provider,
        });
      });

      it('should log the error and report telemetry when updateAttackDiscovery rejects', async () => {
        updateAttackDiscovery.mockRejectedValue(mockError);
        await handleToolError(mockArgs);

        expect(mockLogger.error).toHaveBeenCalledWith(mockError);
        expect(updateAttackDiscovery).toHaveBeenCalledWith({
          attackDiscoveryUpdateProps: {
            status: attackDiscoveryStatus.failed,
            attackDiscoveries: [],
            backingIndex: 'foo',
            failureReason: 'Test error',
            id: 'discovery-id',
            replacements: {},
          },
          authenticatedUser: mockArgs.authenticatedUser,
        });
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
          actionTypeId: mockArgs.apiConfig.actionTypeId,
          errorMessage: mockError.message,
          model: mockArgs.apiConfig.model,
          provider: mockArgs.apiConfig.provider,
        });
      });

      it('should return and not call updateAttackDiscovery when getAttackDiscovery returns a canceled response', async () => {
        getAttackDiscovery.mockResolvedValue({
          ...mockCurrentAd,
          status: attackDiscoveryStatus.canceled,
        });
        await handleToolError(mockArgs);

        expect(mockTelemetry.reportEvent).not.toHaveBeenCalled();
        expect(updateAttackDiscovery).not.toHaveBeenCalled();
      });

      it('should log the error and report telemetry when getAttackDiscovery rejects', async () => {
        getAttackDiscovery.mockRejectedValue(mockError);
        await handleToolError(mockArgs);

        expect(mockLogger.error).toHaveBeenCalledWith(mockError);
        expect(updateAttackDiscovery).not.toHaveBeenCalled();
        expect(mockTelemetry.reportEvent).toHaveBeenCalledWith('attack_discovery_error', {
          actionTypeId: mockArgs.apiConfig.actionTypeId,
          errorMessage: mockError.message,
          model: mockArgs.apiConfig.model,
          provider: mockArgs.apiConfig.provider,
        });
      });
    });
  });
  describe('getAttackDiscoveryStats', () => {
    const mockDiscoveries = [
      {
        timestamp: '2024-06-13T17:55:11.360Z',
        id: '8abb49bd-2f5d-43d2-bc2f-dd3c3cab25ad',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-13T17:55:11.360Z',
        updatedAt: '2024-06-17T20:47:57.556Z',
        lastViewedAt: '2024-06-17T20:47:57.556Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'failed',
        alertsContextCount: undefined,
        apiConfig: {
          connectorId: 'my-bedrock-old',
          actionTypeId: '.bedrock',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: [],
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason:
          'ActionsClientLlm: action result status is error: an error occurred while running the action - Response validation failed (Error: [usage.input_tokens]: expected value of type [number] but got [undefined])',
      },
      {
        timestamp: '2024-06-13T17:55:11.360Z',
        id: '9abb49bd-2f5d-43d2-bc2f-dd3c3cab25ad',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-13T17:55:11.360Z',
        updatedAt: '2024-06-17T20:47:57.556Z',
        lastViewedAt: '2024-06-17T20:46:57.556Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'failed',
        alertsContextCount: undefined,
        apiConfig: {
          connectorId: 'my-bedrock-old',
          actionTypeId: '.bedrock',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: [],
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason:
          'ActionsClientLlm: action result status is error: an error occurred while running the action - Response validation failed (Error: [usage.input_tokens]: expected value of type [number] but got [undefined])',
      },
      {
        timestamp: '2024-06-12T19:54:50.428Z',
        id: '745e005b-7248-4c08-b8b6-4cad263b4be0',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-12T19:54:50.428Z',
        updatedAt: '2024-06-17T20:47:27.182Z',
        lastViewedAt: '2024-06-17T20:27:27.182Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'running',
        alertsContextCount: 20,
        apiConfig: {
          connectorId: 'my-gen-ai',
          actionTypeId: '.gen-ai',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: mockCurrentAd.attackDiscoveries,
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: undefined,
      },
      {
        timestamp: '2024-06-13T17:50:59.409Z',
        id: 'f48da2ca-b63e-4387-82d7-1423a68500aa',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-13T17:50:59.409Z',
        updatedAt: '2024-06-17T20:47:59.969Z',
        lastViewedAt: '2024-06-17T20:47:35.227Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'succeeded',
        alertsContextCount: 20,
        apiConfig: {
          connectorId: 'my-gpt4o-ai',
          actionTypeId: '.gen-ai',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: mockCurrentAd.attackDiscoveries,
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: undefined,
      },
      {
        timestamp: '2024-06-12T21:18:56.377Z',
        id: '82fced1d-de48-42db-9f56-e45122dee017',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-12T21:18:56.377Z',
        updatedAt: '2024-06-17T20:47:39.372Z',
        lastViewedAt: '2024-06-17T20:47:39.372Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'canceled',
        alertsContextCount: 20,
        apiConfig: {
          connectorId: 'my-bedrock',
          actionTypeId: '.bedrock',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: mockCurrentAd.attackDiscoveries,
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: undefined,
      },
      {
        timestamp: '2024-06-12T16:44:23.107Z',
        id: 'a4709094-6116-484b-b096-1e8d151cb4b7',
        backingIndex: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-2024.06.12-000001',
        createdAt: '2024-06-12T16:44:23.107Z',
        updatedAt: '2024-06-17T20:48:16.961Z',
        lastViewedAt: '2024-06-17T20:47:16.961Z',
        users: [mockAuthenticatedUser],
        namespace: 'default',
        status: 'succeeded',
        alertsContextCount: 0,
        apiConfig: {
          connectorId: 'my-gen-a2i',
          actionTypeId: '.gen-ai',
          defaultSystemPromptId: undefined,
          model: undefined,
          provider: undefined,
        },
        attackDiscoveries: [
          ...mockCurrentAd.attackDiscoveries,
          ...mockCurrentAd.attackDiscoveries,
          ...mockCurrentAd.attackDiscoveries,
          ...mockCurrentAd.attackDiscoveries,
        ],
        replacements: {},
        generationIntervals: mockCurrentAd.generationIntervals,
        averageIntervalMs: mockCurrentAd.averageIntervalMs,
        failureReason: 'steph threw an error',
      },
    ];
    beforeEach(() => {
      findAllAttackDiscoveries.mockResolvedValue(mockDiscoveries);
    });
    it('returns the formatted stats object', async () => {
      const stats = await getAttackDiscoveryStats({
        authenticatedUser: mockAuthenticatedUser,
        dataClient: mockDataClient,
      });
      expect(stats).toEqual([
        {
          hasViewed: true,
          status: 'failed',
          count: 0,
          connectorId: 'my-bedrock-old',
        },
        {
          hasViewed: false,
          status: 'failed',
          count: 0,
          connectorId: 'my-bedrock-old',
        },
        {
          hasViewed: false,
          status: 'running',
          count: 1,
          connectorId: 'my-gen-ai',
        },
        {
          hasViewed: false,
          status: 'succeeded',
          count: 1,
          connectorId: 'my-gpt4o-ai',
        },
        {
          hasViewed: true,
          status: 'canceled',
          count: 1,
          connectorId: 'my-bedrock',
        },
        {
          hasViewed: false,
          status: 'succeeded',
          count: 4,
          connectorId: 'my-gen-a2i',
        },
      ]);
    });
  });
});
