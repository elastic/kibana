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

const mockFieldData = {
  name: 'name',
  type: 'semantic_text',
  inferenceId: 'elser_model_2',
} as Field;

const mockFieldForThirdPartyModel = {
  name: 'name',
  type: 'semantic_text',
  inferenceId: 'openai',
} as Field;

const mockFieldForElserEndpointFromInferenceFlyout = {
  name: 'name',
  type: 'semantic_text',
  inferenceId: 'my_elser_endpoint',
} as Field;

const mockOpenaiConfig: CustomInferenceEndpointConfig = {
  taskType: 'text_embedding',
  modelConfig: {
    service: 'openai',
    service_settings: {
      api_key: 'test',
      model_id: 'text-embedding-ada-002',
    },
  },
};
const mockElserConfig: CustomInferenceEndpointConfig = {
  taskType: 'sparse_embedding',
  modelConfig: {
    service: 'elser',
    service_settings: {
      num_allocations: 1,
      num_threads: 1,
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

describe('useSemanticText', () => {
  let form: any;
  let formForThirdPartyModel: any;
  let formForEndpointCreatedFromInferenceFlyout: any;
  beforeEach(() => {
    jest.clearAllMocks();
    form = {
      getFields: jest.fn().mockReturnValue({
        referenceField: { value: 'title' },
        name: { value: 'sem' },
        type: { value: [{ value: 'semantic_text' }] },
        inferenceId: { value: 'e5' },
      }),
    };

    formForThirdPartyModel = {
      getFields: jest.fn().mockReturnValue({
        referenceField: { value: 'title' },
        name: { value: 'semantic_text_openai_endpoint' },
        type: { value: [{ value: 'semantic_text' }] },
        inferenceId: { value: 'openai' },
      }),
    };

    formForEndpointCreatedFromInferenceFlyout = {
      getFields: jest.fn().mockReturnValue({
        referenceField: { value: 'title' },
        name: { value: 'semantic_text_elserServiceType_endpoint' },
        type: { value: [{ value: 'semantic_text' }] },
        inferenceId: { value: 'my_elser_endpoint' },
      }),
    };
  });
  it('should handle semantic text with third party model correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: formForThirdPartyModel,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );
    await act(async () => {
      result.current.setInferenceValue('openai');
      result.current.handleSemanticText(mockFieldForThirdPartyModel, mockOpenaiConfig);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockFieldForThirdPartyModel,
    });
    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).toHaveBeenCalledWith(
      'openai',
      'text_embedding',
      mockOpenaiConfig.modelConfig
    );
  });
  it('should handle semantic text with inference endpoint created from flyout correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({
        form: formForEndpointCreatedFromInferenceFlyout,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMock,
      })
    );
    await act(async () => {
      result.current.setInferenceValue('my_elser_endpoint');
      result.current.handleSemanticText(
        mockFieldForElserEndpointFromInferenceFlyout,
        mockElserConfig
      );
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockFieldForElserEndpointFromInferenceFlyout,
    });
    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).toHaveBeenCalledWith(
      'my_elser_endpoint',
      'sparse_embedding',
      mockElserConfig.modelConfig
    );
  });
  it('should populate the values from the form', () => {
    const { result } = renderHook(() =>
      useSemanticText({ form, setErrorsInTrainedModelDeployment: jest.fn(), ml: mlMock })
    );

    expect(result.current.referenceFieldComboValue).toBe('title');
    expect(result.current.nameValue).toBe('sem');
    expect(result.current.inferenceIdComboValue).toBe('e5');
    expect(result.current.semanticFieldType).toBe('semantic_text');
  });

  it('should handle semantic text correctly', async () => {
    const { result } = renderHook(() =>
      useSemanticText({ form, setErrorsInTrainedModelDeployment: jest.fn(), ml: mlMock })
    );

    await act(async () => {
      result.current.handleSemanticText(mockFieldData);
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockFieldData,
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

  it('handles errors correctly', async () => {
    const mockError = new Error('Test error');
    mlMock.mlApi?.inferenceModels.createInferenceEndpoint.mockImplementationOnce(() => {
      throw mockError;
    });

    const setErrorsInTrainedModelDeployment = jest.fn();

    const { result } = renderHook(() =>
      useSemanticText({ form, setErrorsInTrainedModelDeployment, ml: mlMock })
    );

    await act(async () => {
      result.current.handleSemanticText(mockFieldData);
    });

    expect(setErrorsInTrainedModelDeployment).toHaveBeenCalledWith(expect.any(Function));
  });
});
