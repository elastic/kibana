/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { getAttackDiscovery } from './get_attack_discovery';
import { updateAttackDiscovery } from './update_attack_discovery';
import {
  AttackDiscoveryResponse,
  AttackDiscoveryStatus,
  AttackDiscoveryUpdateProps,
} from '@kbn/elastic-assistant-common';
import { AuthenticatedUser } from '@kbn/core-security-common';
jest.mock('./get_attack_discovery');
const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();
const user = {
  username: 'test_user',
  profile_uid: '1234',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
const updateProps: AttackDiscoveryUpdateProps = {
  id: 'existing-id',
  backingIndex: 'attack-discovery-index',
  status: 'succeeded' as AttackDiscoveryStatus,
  attackDiscoveries: [
    {
      alertIds: ['alert-1'],
      title: 'Updated Title',
      detailsMarkdown: '# Updated Details',
      entitySummaryMarkdown: '# Updated Summary',
      timestamp: '2024-06-07T21:19:08.090Z',
      id: 'existing-id',
      mitreAttackTactics: ['T1234'],
      summaryMarkdown: '# Updated Summary',
    },
  ],
};
const mockRequest = {
  esClient: mockEsClient,
  attackDiscoveryIndex: 'attack-discovery-index',
  attackDiscoveryUpdateProps: updateProps,
  user,
  logger: mockLogger,
};

const existingAttackDiscovery: AttackDiscoveryResponse = {
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
  status: 'running',
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId: 'my-gpt4o-ai',
  },
  attackDiscoveries: [],
  lastViewedAt: '2024-06-07T21:19:08.090Z',
  updatedAt: '2024-06-07T21:19:08.090Z',
  replacements: {
    'f19e1a0a-de3b-496c-8ace-dd91229e1084': 'root',
  },
  namespace: 'default',
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

const mockGetDiscovery = getAttackDiscovery as jest.Mock;

describe('updateAttackDiscovery', () => {
  const date = '2024-03-28T22:27:28.000Z';
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(new Date(date));
    jest.clearAllMocks();
    mockGetDiscovery.mockResolvedValue(existingAttackDiscovery);
  });

  it('should update attack discovery successfully', async () => {
    const response = await updateAttackDiscovery(mockRequest);
    expect(response).not.toBeNull();
    expect(response!.id).toEqual('existing-id');
    expect(mockEsClient.update).toHaveBeenCalledTimes(1);
    expect(mockEsClient.update).toHaveBeenCalledWith({
      refresh: 'wait_for',
      index: 'attack-discovery-index',
      id: 'existing-id',
      doc: {
        attack_discoveries: [
          {
            id: 'existing-id',
            alert_ids: ['alert-1'],
            title: 'Updated Title',
            details_markdown: '# Updated Details',
            entity_summary_markdown: '# Updated Summary',
            mitre_attack_tactics: ['T1234'],
            summary_markdown: '# Updated Summary',
            timestamp: date,
          },
        ],
        id: 'existing-id',
        status: 'succeeded',
        updated_at: date,
      },
    });
    expect(mockGetDiscovery).toHaveBeenCalledTimes(1);
    const { attackDiscoveryUpdateProps, ...rest } = mockRequest;
    expect(mockGetDiscovery).toHaveBeenCalledWith({
      ...rest,
      id: attackDiscoveryUpdateProps.id,
    });
  });

  it('should not update attack_discoveries if none are present', async () => {
    const { attackDiscoveries, ...rest } = mockRequest.attackDiscoveryUpdateProps;
    const response = await updateAttackDiscovery({
      ...mockRequest,
      attackDiscoveryUpdateProps: rest,
    });

    expect(response).not.toBeNull();
    expect(response!.id).toEqual('existing-id');
    expect(mockEsClient.update).toHaveBeenCalledTimes(1);
    expect(mockEsClient.update).toHaveBeenCalledWith({
      refresh: 'wait_for',
      index: 'attack-discovery-index',
      id: 'existing-id',
      doc: {
        id: 'existing-id',
        status: 'succeeded',
        updated_at: date,
      },
    });
    expect(mockGetDiscovery).toHaveBeenCalledTimes(1);
    const { attackDiscoveryUpdateProps, ...rest2 } = mockRequest;
    expect(mockGetDiscovery).toHaveBeenCalledWith({
      ...rest2,
      id: attackDiscoveryUpdateProps.id,
    });
  });

  it('should throw error on elasticsearch update failure', async () => {
    const error = new Error('Elasticsearch update error');
    mockEsClient.update.mockRejectedValueOnce(error);

    await expect(updateAttackDiscovery(mockRequest)).rejects.toThrowError(error);

    expect(mockEsClient.update).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      `Error updating attackDiscovery: ${error} by ID: existing-id`
    );
  });
});
