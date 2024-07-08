/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed } from '@kbn/test-jest-helpers';
import {
  TrainedModelsDeploymentModal,
  TrainedModelsDeploymentModalProps,
} from '../../../public/application/sections/home/index_list/details_page/trained_models_deployment_modal';
import { act } from 'react-dom/test-utils';
import * as mappingsContext from '../../../public/application/components/mappings_editor/mappings_state_context';
import { NormalizedField } from '../../../public/application/components/mappings_editor/types';

jest.mock('../../../public/hooks/use_ml_model_status_toasts', () => ({
  useMLModelNotificationToasts: jest.fn().mockReturnValue({
    showErrorToasts: jest.fn(),
  }),
}));

jest.mock('../../../public/application/app_context', () => ({
  useAppContext: jest.fn().mockReturnValue({
    url: undefined,
    plugins: {
      ml: {
        mlApi: {
          trainedModels: {
            getModelsDownloadStatus: jest.fn().mockResolvedValue({}),
            getTrainedModels: jest.fn().mockResolvedValue([
              {
                model_id: '.elser_model_2',
                model_type: 'pytorch',
                model_package: {
                  packaged_model_id: 'elser_model_2',
                  model_repository: 'https://ml-models.elastic.co',
                  minimum_version: '11.0.0',
                  size: 438123914,
                  sha256: '',
                  metadata: {},
                  tags: [],
                  vocabulary_file: 'elser_model_2.vocab.json',
                },
                description: 'Elastic Learned Sparse EncodeR v2',
                tags: ['elastic'],
              },
            ]),
            getTrainedModelStats: jest.fn().mockResolvedValue({
              count: 1,
              trained_model_stats: [
                {
                  model_id: '.elser_model_2',

                  deployment_stats: {
                    deployment_id: 'elser_model_2',
                    model_id: '.elser_model_2',
                    threads_per_allocation: 1,
                    number_of_allocations: 1,
                    queue_capacity: 1024,
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

jest.mock('../../../public/application/components/mappings_editor/mappings_state_context');

const mappingsContextMocked = jest.mocked(mappingsContext);

const defaultState = {
  inferenceToModelIdMap: {
    e5: {
      isDeployed: false,
      isDeployable: true,
      trainedModelId: '.multilingual-e5-small',
    },
    elser_model_2: {
      isDeployed: false,
      isDeployable: true,
      trainedModelId: '.elser_model_2',
    },
    openai: {
      isDeployed: false,
      isDeployable: false,
      trainedModelId: '',
    },
    my_elser_endpoint: {
      isDeployed: false,
      isDeployable: true,
      trainedModelId: '.elser_model_2',
    },
  },
  fields: {
    aliases: {},
    byId: {},
    rootLevelFields: [],
    maxNestedDepth: 0,
  },
  mappingViewFields: { byId: {} },
} as any;

const setErrorsInTrainedModelDeployment = jest.fn().mockReturnValue(undefined);
const fetchData = jest.fn().mockReturnValue(undefined);

describe('When semantic_text is enabled', () => {
  const setup = (defaultProps: Partial<TrainedModelsDeploymentModalProps>) =>
    registerTestBed(TrainedModelsDeploymentModal, {
      defaultProps,
      memoryRouter: { wrapComponent: false },
    })();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('When there are no pending deployments and no errors in the model deployment', () => {
    mappingsContextMocked.useMappingsState.mockReturnValue(defaultState);
    const { exists } = setup({
      errorsInTrainedModelDeployment: {},
      fetchData,
      setErrorsInTrainedModelDeployment: () => undefined,
    });

    it('should not display the modal', () => {
      expect(exists('trainedModelsDeploymentModal')).toBe(false);
    });
  });

  describe('When there are pending deployments in the model deployment', () => {
    mappingsContextMocked.useMappingsState.mockReturnValue({
      ...defaultState,
      fields: {
        ...defaultState.fields,
        byId: {
          new_field: {
            id: 'new_field',
            isMultiField: false,
            path: ['new_field'],
            source: {
              name: 'new_field',
              type: 'semantic_text',
              reference_field: 'title',
              inference_id: 'elser_model_2',
            },
          } as NormalizedField,
        },
        rootLevelFields: ['new_field'],
      },
    } as any);
    const { exists, find } = setup({
      errorsInTrainedModelDeployment: {},
      fetchData,
      setErrorsInTrainedModelDeployment,
    });

    it('should display the modal', () => {
      expect(exists('trainedModelsDeploymentModal')).toBe(true);
    });

    it('should contain content related to semantic_text', () => {
      expect(find('trainedModelsDeploymentModalText').text()).toContain(
        'Some fields are referencing models'
      );
    });

    it('should call fetch data if refresh button is pressed', async () => {
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      expect(fetchData.mock.calls).toHaveLength(1);
    });
  });

  describe('When there is error in the model deployment', () => {
    mappingsContextMocked.useMappingsState.mockReturnValue({
      ...defaultState,
      fields: {
        ...defaultState.fields,
        byId: {
          new_field: {
            id: 'new_field',
            isMultiField: false,
            path: ['new_field'],
            source: {
              name: 'new_field',
              type: 'semantic_text',
              reference_field: 'title',
              inference_id: 'elser_model_2',
            },
          } as NormalizedField,
        },
        rootLevelFields: ['new_field'],
      },
    } as any);
    const { find } = setup({
      fetchData,
      errorsInTrainedModelDeployment: { '.elser_model_2': 'Error' },
      setErrorsInTrainedModelDeployment,
    });

    it('should display text related to errored deployments', () => {
      expect(find('trainedModelsDeploymentModalText').text()).toContain('There was an error');
    });

    it('should display only the errored deployment', () => {
      expect(find('trainedModelsDeploymentModal').text()).toContain('.elser_model_2');
      expect(find('trainedModelsDeploymentModal').text()).not.toContain('valid-model');
    });

    it("should call refresh method if 'Try again' button is pressed", async () => {
      await act(async () => {
        find('confirmModalConfirmButton').simulate('click');
      });
      expect(fetchData.mock.calls).toHaveLength(1);
    });

    it('should call setIsVisibleForErrorModal method if cancel button is pressed', async () => {
      await act(async () => {
        find('confirmModalCancelButton').simulate('click');
      });
    });
  });
});
