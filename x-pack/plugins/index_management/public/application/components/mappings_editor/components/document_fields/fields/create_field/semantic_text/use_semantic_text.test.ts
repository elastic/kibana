/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { CustomInferenceEndpointConfig, Field } from '../../../../../types';
import { useSemanticText } from './use_semantic_text';
import { act } from 'react-dom/test-utils';

const mlMock: any = {
  mlApi: {
    inferenceModels: {
      createInferenceEndpoint: jest.fn().mockResolvedValue({}),
    },
  },
};

const mockField: Record<string, Field> = {
  elser_model_2: {
    name: 'name',
    type: 'semantic_text',
    inferenceId: 'elser_model_2',
  },
  e5: {
    name: 'name',
    type: 'semantic_text',
    inferenceId: 'e5',
  },
  openai: {
    name: 'name',
    type: 'semantic_text',
    inferenceId: 'openai',
  },
  my_elser_endpoint: {
    name: 'name',
    type: 'semantic_text',
    inferenceId: 'my_elser_endpoint',
  },
};

const mockConfig: Record<string, CustomInferenceEndpointConfig> = {
  openai: {
    taskType: 'text_embedding',
    modelConfig: {
      service: 'openai',
      service_settings: {
        api_key: 'test',
        model_id: 'text-embedding-ada-002',
      },
    },
  },
  elser: {
    taskType: 'sparse_embedding',
    modelConfig: {
      service: 'elser',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
      },
    },
  },
};

const mockDispatch = jest.fn();

jest.mock('../../../../../mappings_state_context', () => ({
  useMappingsState: jest.fn().mockReturnValue({
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
  }),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../../component_templates/component_templates_context', () => ({
  useComponentTemplatesContext: jest.fn().mockReturnValue({
    toasts: {
      addError: jest.fn(),
      addSuccess: jest.fn(),
    },
  }),
}));

jest.mock('../../../../../../../services/api', () => ({
  getInferenceEndpoints: jest.fn().mockResolvedValue({
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

describe('useSemanticText', () => {
  let mockForm: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockForm = {
      form: {
        getFields: jest.fn().mockReturnValue({
          referenceField: { value: 'title' },
          name: { value: 'sem' },
          type: { value: [{ value: 'semantic_text' }] },
          inferenceId: { value: 'e5' },
        }),
      },
      thirdPartyModel: {
        getFields: jest.fn().mockReturnValue({
          referenceField: { value: 'title' },
          name: { value: 'semantic_text_openai_endpoint' },
          type: { value: [{ value: 'semantic_text' }] },
          inferenceId: { value: 'openai' },
        }),
      },
      elasticModelEndpointCreatedfromFlyout: {
        getFields: jest.fn().mockReturnValue({
          referenceField: { value: 'title' },
          name: { value: 'semantic_text_elserServiceType_endpoint' },
          type: { value: [{ value: 'semantic_text' }] },
          inferenceId: { value: 'my_elser_endpoint' },
        }),
      },
    };
  });
  it('should handle semantic text with third party model correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: mockForm.thirdPartyModel,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );
    await act(async () => {
      result.current.setInferenceValue('openai');
      result.current.handleSemanticText(mockField.openai, mockConfig.openai);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockField.openai,
    });
    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).toHaveBeenCalledWith(
      'openai',
      'text_embedding',
      mockConfig.openai.modelConfig
    );
  });
  it('should handle semantic text with inference endpoint created from flyout correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: mockForm.elasticModelEndpointCreatedfromFlyout,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );
    await act(async () => {
      result.current.setInferenceValue('my_elser_endpoint');
      result.current.handleSemanticText(mockField.my_elser_endpoint, mockConfig.elser);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockField.my_elser_endpoint,
    });
    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).toHaveBeenCalledWith(
      'my_elser_endpoint',
      'sparse_embedding',
      mockConfig.elser.modelConfig
    );
  });
  it('should populate the values from the form', () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: mockForm.form,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );

    expect(result.current.referenceFieldComboValue).toBe('title');
    expect(result.current.nameValue).toBe('sem');
    expect(result.current.inferenceIdComboValue).toBe('e5');
    expect(result.current.semanticFieldType).toBe('semantic_text');
  });

  it('should handle semantic text correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: mockForm.form,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );

    await act(async () => {
      result.current.handleSemanticText(mockField.elser_model_2);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockField.elser_model_2,
    });
    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).toHaveBeenCalledWith(
      'elser_model_2',
      'sparse_embedding',
      {
        service: 'elser',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: '.elser_model_2',
        },
      }
    );
  });
  it('does not call create inference endpoint api, if default endpoint already exists', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: mockForm.form,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );

    await act(async () => {
      result.current.setInferenceValue('e5');
      result.current.handleSemanticText(mockField.e5);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockField.e5,
    });

    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).not.toBeCalled();
  });

  it('handles errors correctly', async () => {
    const mockError = new Error('Test error');
    mlMock.mlApi?.inferenceModels.createInferenceEndpoint.mockImplementationOnce(() => {
      throw mockError;
    });

    const setErrorsInTrainedModelDeployment = jest.fn();

    const { result } = renderHook(() =>
      useSemanticText({ form: mockForm.form, setErrorsInTrainedModelDeployment, ml: mlMock })
    );

    await act(async () => {
      result.current.handleSemanticText(mockField.elser_model_2);
    });

    expect(setErrorsInTrainedModelDeployment).toHaveBeenCalledWith(expect.any(Function));
  });
});
