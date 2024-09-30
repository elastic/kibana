/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { NormalizedFields } from '../application/components/mappings_editor/types';
import { useDetailsPageMappingsModelManagement } from './use_details_page_mappings_model_management';

jest.mock('../application/app_context', () => ({
  useAppContext: () => ({
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getModelsDownloadStatus: jest.fn().mockResolvedValue({
              '.elser_model_2_linux-x86_64': {},
            }),
            getTrainedModelStats: jest.fn().mockResolvedValue({
              trained_model_stats: [
                {
                  model_id: '.elser_model_2-x86_64',
                  deployment_stats: {
                    deployment_id: 'elser_model_2',
                    model_id: '.elser_model_2-x86_64',
                    state: 'not started',
                  },
                },
                {
                  model_id: '.multilingual-e5-small',
                  deployment_stats: {
                    deployment_id: 'e5',
                    model_id: '.multilingual-e5-small',
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
  getInferenceEndpoints: jest.fn().mockResolvedValue({
    data: [
      {
        inference_id: 'e5',
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
  useMappingsState: () => ({
    fields: {
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
      rootLevelFields: [
        '88ebcfdb-19b7-4458-9ea2-9488df54453d',
        'c5d86c82-ea07-4457-b469-3ffd4b96db81',
      ],
      maxNestedDepth: 2,
    } as NormalizedFields,
    inferenceToModelIdMap: {
      elser_model_2: {
        trainedModelId: '.elser_model_2',
        isDeployed: false,
        isDeployable: true,
        isDownloading: false,
      },
      e5: {
        trainedModelId: '.multilingual-e5-small',
        isDeployed: true,
        isDeployable: true,
        isDownloading: false,
      },
    },
  }),
}));

const mockDispatch = jest.fn();

describe('useDetailsPageMappingsModelManagement', () => {
  it('should call the dispatch with correct parameters', async () => {
    const { result } = renderHook(() => useDetailsPageMappingsModelManagement());

    await result.current.fetchInferenceToModelIdMap();

    const expectedMap = {
      type: 'inferenceToModelIdMap.update',
      value: {
        inferenceToModelIdMap: {
          e5: {
            isDeployed: true,
            isDeployable: true,
            trainedModelId: '.multilingual-e5-small',
            isDownloading: false,
            modelStats: {
              deployment_id: 'e5',
              model_id: '.multilingual-e5-small',
              state: 'started',
            },
          },
          elser_model_2: {
            isDeployed: false,
            isDeployable: true,
            trainedModelId: '.elser_model_2_linux-x86_64',
            isDownloading: true,
            modelStats: undefined,
          },
        },
      },
    };
    expect(mockDispatch).toHaveBeenCalledWith(expectedMap);
  });
});
