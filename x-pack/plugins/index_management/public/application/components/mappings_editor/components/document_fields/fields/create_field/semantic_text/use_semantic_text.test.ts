/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { Field } from '../../../../../types';
import { useSemanticText } from './use_semantic_text';
import { act } from 'react-dom/test-utils';

const mlMock: any = {
  mlApi: {
    inferenceModels: {
      createInferenceEndpoint: jest.fn().mockResolvedValue({}),
    },
    trainedModels: {
      startModelAllocation: jest.fn().mockResolvedValue({}),
      getTrainedModels: jest.fn().mockResolvedValue([
        {
          fully_defined: true,
        },
      ]),
    },
  },
};

const mockFieldData = {
  name: 'name',
  type: 'semantic_text',
  inferenceId: 'elser_model_2',
} as Field;

const mockDispatch = jest.fn();

jest.mock('../../../../../mappings_state_context', () => ({
  useMappingsState: jest.fn().mockReturnValue({
    inferenceToModelIdMap: {
      e5: {
        defaultInferenceEndpoint: false,
        isDeployed: false,
        isDeployable: true,
        trainedModelId: '.multilingual-e5-small',
      },
      elser_model_2: {
        defaultInferenceEndpoint: true,
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

    expect(mlMock.mlApi.trainedModels.startModelAllocation).toHaveBeenCalledWith('.elser_model_2');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'field.addSemanticText',
      value: mockFieldData,
    });
    expect(mlMock.mlApi.inferenceModels.createInferenceEndpoint).toHaveBeenCalledWith(
      'elser_model_2',
      'text_embedding',
      {
        service: 'elasticsearch',
        service_settings: {
          num_allocations: 1,
          num_threads: 1,
          model_id: '.elser_model_2',
        },
      }
    );
  });

  it('should invoke the download api if the model does not exist', async () => {
    const mlMockWithModelNotDownloaded: any = {
      mlApi: {
        inferenceModels: {
          createInferenceEndpoint: jest.fn(),
        },
        trainedModels: {
          startModelAllocation: jest.fn(),
          getTrainedModels: jest.fn().mockResolvedValue([
            {
              fully_defined: false,
            },
          ]),
          installElasticTrainedModelConfig: jest.fn().mockResolvedValue({}),
        },
      },
    };
    const { result } = renderHook(() =>
      useSemanticText({
        form,
        setErrorsInTrainedModelDeployment: jest.fn(),
        ml: mlMockWithModelNotDownloaded,
      })
    );

    await act(async () => {
      result.current.handleSemanticText(mockFieldData);
    });

    expect(
      mlMockWithModelNotDownloaded.mlApi.trainedModels.installElasticTrainedModelConfig
    ).toHaveBeenCalledWith('.elser_model_2');
    expect(
      mlMockWithModelNotDownloaded.mlApi.trainedModels.startModelAllocation
    ).toHaveBeenCalledWith('.elser_model_2');
    expect(
      mlMockWithModelNotDownloaded.mlApi.inferenceModels.createInferenceEndpoint
    ).toHaveBeenCalledWith('elser_model_2', 'text_embedding', {
      service: 'elasticsearch',
      service_settings: {
        num_allocations: 1,
        num_threads: 1,
        model_id: '.elser_model_2',
      },
    });
  });

  it('handles errors correctly', async () => {
    const mockError = new Error('Test error');
    mlMock.mlApi?.trainedModels.startModelAllocation.mockImplementationOnce(() => {
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
