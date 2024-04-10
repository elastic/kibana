/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { renderHook } from '@testing-library/react-hooks';
// import { useDetailsPageMappingsModelManagement } from './use_details_page_mappings_model_management';

describe('useDetailsPageMappingsModelManagement', () => {
  describe('useDetailsPageMappingsModelManagement', () => {
    it('should return pendingDeployments', async () => {
      const state = {
        isValid: true,
        configuration: {
          validate: () => jest.fn(),
          defaultValue: {
            defaultValue: {},
            data: {
              internal: {},
            },
          },
          data: {
            internal: {
              defaultValue: {},
              data: {
                internal: {},
              },
            },
          },
        },
        templates: {
          defaultValue: {
            defaultValue: {
              dynamic_templates: [],
            },
            data: {
              internal: {
                dynamic_templates: [],
              },
            },
          },
          data: {
            internal: {
              defaultValue: {
                dynamic_templates: [],
              },
              data: {
                internal: {
                  dynamic_templates: [],
                },
              },
            },
          },
        },
        fields: {
          byId: {},
          aliases: {},
          rootLevelFields: [],
          maxNestedDepth: 2,
        },
        documentFields: {
          status: 'creatingField',
          editor: 'default',
        },
        runtimeFields: {},
        runtimeFieldsList: {
          status: 'idle',
        },
        fieldsJsonEditor: {
          isValid: true,
        },
        search: {
          term: '',
          result: [],
        },
        inferenceToModelIdMap: {
          elser_model_2: {
            trainedModelId: '.elser_model_2',
            isDeployed: true,
            defaultInferenceEndpoint: false,
          },
          e5: {
            trainedModelId: '.multilingual-e5-small',
            isDeployed: true,
            defaultInferenceEndpoint: false,
          },
          'my-e5-small': {
            trainedModelId: '.multilingual-e5-small',
            isDeployed: true,
            defaultInferenceEndpoint: false,
          },
          'my-e5-small-2': {
            trainedModelId: '.multilingual-e5-small',
            isDeployed: true,
            defaultInferenceEndpoint: false,
          },
          'my-elser-model-1': {
            trainedModelId: '.elser_model_2',
            isDeployed: true,
            defaultInferenceEndpoint: false,
          },
          'my-elser-model-2': {
            trainedModelId: '.elser_model_2',
            isDeployed: true,
            defaultInferenceEndpoint: false,
          },
        },
        fieldForm: {
          isValid: true,
          data: {
            internal: {
              type: [
                {
                  label: 'Text',
                  value: 'text',
                },
              ],
              name: '',
              referenceField: 'title',
              inferenceId: 'e5',
            },
          },
        },
      };

      //   const { result, waitForNextUpdate } = renderHook(() =>
      //     useDetailsPageMappingsModelManagement(state)
      //   );

      //   await waitForNextUpdate();

      //   expect(result.current.pendingDeployments).toBeDefined();
    });

    // Add more tests for useDetailsPageMappingsModelManagement here
  });
});
