/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../endpoint/mocks';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { FetchEndpointPolicyNamespaceResponse } from '../../endpoint/services/fleet';
import { createPolicyDataStreamsIfNeeded } from './create_policy_datastreams';

describe('createPolicyDataStreamsIfNeeded()', () => {
  let endpointServicesMock: ReturnType<typeof createMockEndpointAppContextService>;
  let esClientMock: ElasticsearchClientMock;
  let policyNamespacesMock: FetchEndpointPolicyNamespaceResponse;

  beforeEach(() => {
    endpointServicesMock = createMockEndpointAppContextService();

    esClientMock = endpointServicesMock.getInternalEsClient() as ElasticsearchClientMock;
    esClientMock.indices.exists.mockResolvedValue(false);

    policyNamespacesMock = { integrationPolicy: { '123': ['foo1', 'foo2'] } };
    (
      endpointServicesMock.getInternalFleetServices().getPolicyNamespace as jest.Mock
    ).mockResolvedValue(policyNamespacesMock);
  });

  afterEach(() => {
    createPolicyDataStreamsIfNeeded.cache.deleteAll();
  });

  it('should create datastreams if they do not exist', async () => {
    await createPolicyDataStreamsIfNeeded({
      endpointServices: endpointServicesMock,
      endpointPolicyIds: ['123'],
    });

    expect(esClientMock.indices.createDataStream).toHaveBeenCalledTimes(4);
    [
      '.logs-endpoint.diagnostic.collection-foo1',
      '.logs-endpoint.diagnostic.collection-foo2',
      '.logs-endpoint.action.responses-foo1',
      '.logs-endpoint.action.responses-foo2',
    ].forEach((indexName) => {
      expect(esClientMock.indices.createDataStream).toHaveBeenCalledWith({
        name: indexName,
      });
    });
  });

  it('should not create datastream if they already exist', async () => {
    esClientMock.indices.exists.mockImplementation(async (options) => {
      return (
        options.index === '.logs-endpoint.action.responses-foo1' ||
        options.index === '.logs-endpoint.diagnostic.collection-foo1'
      );
    });

    await createPolicyDataStreamsIfNeeded({
      endpointServices: endpointServicesMock,
      endpointPolicyIds: ['123'],
    });

    expect(esClientMock.indices.createDataStream).toHaveBeenCalledTimes(2);
    ['.logs-endpoint.diagnostic.collection-foo2', '.logs-endpoint.action.responses-foo2'].forEach(
      (indexName) => {
        expect(esClientMock.indices.createDataStream).toHaveBeenCalledWith({
          name: indexName,
        });
      }
    );
  });

  it('should create heartbeat index when running in serverless', async () => {
    (endpointServicesMock.isServerless as jest.Mock).mockReturnValue(true);
    await createPolicyDataStreamsIfNeeded({
      endpointServices: endpointServicesMock,
      endpointPolicyIds: ['123'],
    });

    expect(esClientMock.indices.createDataStream).toHaveBeenCalledTimes(6);
    [
      '.logs-endpoint.diagnostic.collection-foo1',
      '.logs-endpoint.diagnostic.collection-foo2',
      '.logs-endpoint.action.responses-foo1',
      '.logs-endpoint.action.responses-foo2',
      '.logs-endpoint.heartbeat-foo1',
      '.logs-endpoint.heartbeat-foo2',
    ].forEach((indexName) => {
      expect(esClientMock.indices.createDataStream).toHaveBeenCalledWith({
        name: indexName,
      });
    });
  });

  it('should not call ES if index existence was already checked', async () => {
    createPolicyDataStreamsIfNeeded.cache.set('.logs-endpoint.action.responses-foo1', true);
    await createPolicyDataStreamsIfNeeded({
      endpointServices: endpointServicesMock,
      endpointPolicyIds: ['123'],
    });

    expect(esClientMock.indices.exists).not.toHaveBeenCalledWith({
      index: '.logs-endpoint.action.responses-foo1',
    });
    expect(esClientMock.indices.createDataStream).toHaveBeenCalledTimes(3);
    [
      '.logs-endpoint.diagnostic.collection-foo1',
      '.logs-endpoint.diagnostic.collection-foo2',
      '.logs-endpoint.action.responses-foo2',
    ].forEach((indexName) => {
      expect(esClientMock.indices.createDataStream).toHaveBeenCalledWith({
        name: indexName,
      });
    });
  });
});
