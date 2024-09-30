/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { TrainedModelConfigResponse } from '../../common/types/trained_models';
import { populateInferenceServicesProvider } from './trained_models';
import { mlLog } from '../lib/log';

jest.mock('../lib/log');

describe('populateInferenceServicesProvider', () => {
  const client = elasticsearchClientMock.createScopedClusterClient();

  let trainedModels: TrainedModelConfigResponse[];

  const inferenceServices = [
    {
      service: 'elser',
      model_id: 'elser_test',
      service_settings: { model_id: '.elser_model_2' },
    },
    { service: 'open_api_01', model_id: 'open_api_model', service_settings: {} },
  ];

  beforeEach(() => {
    trainedModels = [
      { model_id: '.elser_model_2' },
      { model_id: 'model2' },
    ] as TrainedModelConfigResponse[];

    client.asInternalUser.transport.request.mockResolvedValue({ endpoints: inferenceServices });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when the user has required privileges', () => {
    beforeEach(() => {
      client.asCurrentUser.transport.request.mockResolvedValue({ endpoints: inferenceServices });
    });

    test('should populate inference services for trained models', async () => {
      const populateInferenceServices = populateInferenceServicesProvider(client);
      // act
      await populateInferenceServices(trainedModels, false);

      // assert
      expect(client.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_inference/_all',
      });

      expect(client.asInternalUser.transport.request).not.toHaveBeenCalled();

      expect(trainedModels[0].inference_apis).toEqual([
        {
          model_id: 'elser_test',
          service: 'elser',
          service_settings: { model_id: '.elser_model_2' },
        },
      ]);
      expect(trainedModels[0].hasInferenceServices).toBe(true);

      expect(trainedModels[1].inference_apis).toEqual(undefined);
      expect(trainedModels[1].hasInferenceServices).toBe(false);

      expect(mlLog.error).not.toHaveBeenCalled();
    });
  });

  describe('when the user does not have required privileges', () => {
    beforeEach(() => {
      client.asCurrentUser.transport.request.mockRejectedValue(
        new errors.ResponseError(
          elasticsearchClientMock.createApiResponse({
            statusCode: 403,
            body: { message: 'not allowed' },
          })
        )
      );
    });

    test('should retry with internal user if an error occurs', async () => {
      const populateInferenceServices = populateInferenceServicesProvider(client);
      await populateInferenceServices(trainedModels, false);

      // assert
      expect(client.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_inference/_all',
      });

      expect(client.asInternalUser.transport.request).toHaveBeenCalledWith({
        method: 'GET',
        path: '/_inference/_all',
      });

      expect(trainedModels[0].inference_apis).toEqual(undefined);
      expect(trainedModels[0].hasInferenceServices).toBe(true);

      expect(trainedModels[1].inference_apis).toEqual(undefined);
      expect(trainedModels[1].hasInferenceServices).toBe(false);

      expect(mlLog.error).not.toHaveBeenCalled();
    });
  });

  test('should not retry on any other error than 403', async () => {
    const notFoundError = new errors.ResponseError(
      elasticsearchClientMock.createApiResponse({
        statusCode: 404,
        body: { message: 'not found' },
      })
    );

    client.asCurrentUser.transport.request.mockRejectedValue(notFoundError);

    const populateInferenceServices = populateInferenceServicesProvider(client);
    await populateInferenceServices(trainedModels, false);

    // assert
    expect(client.asCurrentUser.transport.request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/_inference/_all',
    });

    expect(client.asInternalUser.transport.request).not.toHaveBeenCalled();

    expect(mlLog.error).toHaveBeenCalledWith(notFoundError);
  });
});
