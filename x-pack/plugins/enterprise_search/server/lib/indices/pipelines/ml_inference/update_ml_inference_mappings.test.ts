/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { ErrorCode } from '../../../../../common/types/error_codes';

import { updateMlInferenceMappings } from './update_ml_inference_mappings';

describe('updateMlInferenceMappings', () => {
  const indexName = 'my-index';

  const mockClient = elasticsearchServiceMock.createScopedClusterClient();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const expectedMapping = {
    ml: {
      properties: {
        inference: {
          properties: {
            input_one_expanded: {
              properties: {
                predicted_value: {
                  type: 'rank_features',
                },
                model_id: {
                  type: 'keyword',
                },
              },
            },
            input_two_expanded: {
              properties: {
                predicted_value: {
                  type: 'rank_features',
                },
                model_id: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      },
    },
  };

  const fieldMappings = [
    {
      sourceField: 'input_one',
      targetField: 'ml.inference.input_one_expanded',
    },
    {
      sourceField: 'input_two',
      targetField: 'ml.inference.input_two_expanded',
    },
  ];

  it('should update mappings for default output', async () => {
    await updateMlInferenceMappings(indexName, fieldMappings, mockClient.asCurrentUser);
    expect(mockClient.asCurrentUser.indices.putMapping).toHaveBeenLastCalledWith({
      index: indexName,
      properties: expectedMapping,
    });
  });

  it('should raise an error if the update fails', async () => {
    mockClient.asCurrentUser.indices.putMapping.mockImplementation(() =>
      Promise.reject({
        meta: {
          body: {
            error: {
              type: 'illegal_argument_exception',
            },
          },
          statusCode: 400,
        },
      })
    );
    await expect(
      updateMlInferenceMappings(indexName, fieldMappings, mockClient.asCurrentUser)
    ).rejects.toThrowError(ErrorCode.MAPPING_UPDATE_FAILED);
  });
});
