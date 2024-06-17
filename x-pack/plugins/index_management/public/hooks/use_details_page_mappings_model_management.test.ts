/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { InferenceToModelIdMap } from '../application/components/mappings_editor/components/document_fields/fields';
import { NormalizedFields } from '../application/components/mappings_editor/types';
import { useDetailsPageMappingsModelManagement } from './use_details_page_mappings_model_management';

jest.mock('../application/app_context', () => ({
  useAppContext: () => ({
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getTrainedModelStats: jest.fn().mockResolvedValue({
              trained_model_stats: [
                {
                  model_id: '.elser_model_2',
                  deployment_stats: {
                    deployment_id: 'elser_model_2',
                    model_id: '.elser_model_2',
                    state: 'started',
                  },
                },
              ],
            }),
          },
        },
      },
    },
  }),
}));

jest.mock('../application/services/api', () => ({
  getInferenceModels: jest.fn().mockResolvedValue({
    data: [
      {
        model_id: 'e5',
        task_type: 'text_embedding',
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: '.multilingual-e5-small',
        },
        task_settings: {},
      },
    ],
  }),
}));

jest.mock('../application/components/mappings_editor/mappings_state_context', () => ({
  useDispatch: () => mockDispatch,
}));
const mockDispatch = jest.fn();
const fields = {
  byId: {
    '88ebcfdb-19b7-4458-9ea2-9488df54453d': {
      id: '88ebcfdb-19b7-4458-9ea2-9488df54453d',
      isMultiField: false,
      source: {
        name: 'title',
        type: 'text',
        copy_to: ['semantic'],
      },
      path: ['title'],
      nestedDepth: 0,
      childFieldsName: 'fields',
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: true,
      hasMultiFields: false,
      isExpanded: false,
    },
    'c5d86c82-ea07-4457-b469-3ffd4b96db81': {
      id: 'c5d86c82-ea07-4457-b469-3ffd4b96db81',
      isMultiField: false,
      source: {
        name: 'semantic',
        inference_id: 'elser_model_2',
        type: 'semantic_text',
      },
      path: ['semantic'],
      nestedDepth: 0,
      childFieldsName: 'fields',
      canHaveChildFields: false,
      hasChildFields: false,
      canHaveMultiFields: true,
      hasMultiFields: false,
      isExpanded: false,
    },
  },
  aliases: {},
  rootLevelFields: ['88ebcfdb-19b7-4458-9ea2-9488df54453d', 'c5d86c82-ea07-4457-b469-3ffd4b96db81'],
  maxNestedDepth: 2,
} as NormalizedFields;

const inferenceToModelIdMap = {
  elser_model_2: {
    trainedModelId: '.elser_model_2',
    isDeployed: true,
    isDeployable: true,
  },
  e5: {
    trainedModelId: '.multilingual-e5-small',
    isDeployed: true,
    isDeployable: true,
  },
} as InferenceToModelIdMap;

describe('useDetailsPageMappingsModelManagement', () => {
  it('should call the dispatch with correct parameters', async () => {
    const { result } = renderHook(() =>
      useDetailsPageMappingsModelManagement(fields, inferenceToModelIdMap)
    );

    await result.current.fetchInferenceToModelIdMap();

    const expectedMap = {
      type: 'inferenceToModelIdMap.update',
      value: {
        inferenceToModelIdMap: {
          e5: {
            isDeployed: false,
            isDeployable: true,
            trainedModelId: '.multilingual-e5-small',
          },
          elser_model_2: {
            isDeployed: true,
            isDeployable: true,
            trainedModelId: '.elser_model_2',
          },
        },
      },
    };
    expect(mockDispatch).toHaveBeenCalledWith(expectedMap);
  });
});
