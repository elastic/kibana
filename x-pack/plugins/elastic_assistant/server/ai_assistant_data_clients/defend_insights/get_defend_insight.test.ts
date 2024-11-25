/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { getDefendInsightsSearchEsMock } from '../../__mocks__/defend_insights_schema.mock';
import { getDefendInsight } from './get_defend_insight';

const mockEsClient = elasticsearchServiceMock.createElasticsearchClient();
const mockLogger = loggerMock.create();

const mockResponse = getDefendInsightsSearchEsMock();

const user = {
  username: 'test_user',
  profile_uid: '1234',
  authentication_realm: {
    type: 'my_realm_type',
    name: 'my_realm_name',
  },
} as AuthenticatedUser;
const mockRequest = {
  esClient: mockEsClient,
  index: 'defend-insights-index',
  id: 'insight-id',
  user,
  logger: mockLogger,
};
describe('getDefendInsight', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get defend insight by id successfully', async () => {
    mockEsClient.search.mockResolvedValueOnce(mockResponse);

    const response = await getDefendInsight(mockRequest);

    expect(response).not.toBeNull();
    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return null if no defend insights found', async () => {
    mockEsClient.search.mockResolvedValueOnce({ ...mockResponse, hits: { hits: [] } });

    const response = await getDefendInsight(mockRequest);

    expect(response).toBeNull();
    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should throw error on elasticsearch search failure', async () => {
    mockEsClient.search.mockRejectedValueOnce(new Error('Elasticsearch error'));

    await expect(getDefendInsight(mockRequest)).rejects.toThrowError('Elasticsearch error');

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });
});
