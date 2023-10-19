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
  const modelId = 'my-model-id';
  const mockClient = elasticsearchServiceMock.createScopedClusterClient();

  beforeEach(() => {
    jest.clearAllMocks();

    mockClient.asCurrentUser.ml.getTrainedModels.mockResolvedValue({
      count: 1,
      trained_model_configs: [
        {
          inference_config: {
            text_expansion: {},
          },
          input: {
            field_names: [],
          },
          model_id: modelId,
          tags: [],
        },
      ],
    });
  });

  const expectedMapping = {
    ml: {
      properties: {
        inference: {
          properties: {
            input_one_expanded: {
              properties: {
                predicted_value: {
                  type: 'sparse_vector',
                },
                model_id: {
                  type: 'keyword',
                },
              },
            },
            input_two_expanded: {
              properties: {
                predicted_value: {
                  type: 'sparse_vector',
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

  it('should update mappings for text expansion pipelines', async () => {
    await updateMlInferenceMappings(indexName, modelId, fieldMappings, mockClient.asCurrentUser);
    expect(mockClient.asCurrentUser.indices.putMapping).toHaveBeenLastCalledWith({
      index: indexName,
      properties: expectedMapping,
    });
  });

  it('should not update mappings for pipelines other than text expansion', async () => {
    const nonTextExpansionModelId = 'some-other-model-id';

    mockClient.asCurrentUser.ml.getTrainedModels.mockResolvedValue({
      count: 1,
      trained_model_configs: [
        {
          inference_config: {
            ner: {},
          },
          input: {
            field_names: [],
          },
          model_id: nonTextExpansionModelId,
          tags: [],
        },
      ],
    });

    await updateMlInferenceMappings(
      indexName,
      nonTextExpansionModelId,
      fieldMappings,
      mockClient.asCurrentUser
    );
    expect(mockClient.asCurrentUser.indices.putMapping).not.toHaveBeenCalled();
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
      updateMlInferenceMappings(indexName, modelId, fieldMappings, mockClient.asCurrentUser)
    ).rejects.toThrowError(ErrorCode.MAPPING_UPDATE_FAILED);
  });
});
