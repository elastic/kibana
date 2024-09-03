/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { FormProvider, LOCAL_STORAGE_KEY } from './form_provider';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';
import { useLLMsModels } from '../hooks/use_llms_models';
import * as ReactHookForm from 'react-hook-form';
import { ChatFormFields } from '../types';
import { useSearchParams } from 'react-router-dom-v5-compat';

jest.mock('../hooks/use_load_fields_by_indices');
jest.mock('../hooks/use_llms_models');
jest.mock('react-router-dom-v5-compat', () => ({
  useSearchParams: jest.fn(() => [{ get: jest.fn() }]),
}));

let formHookSpy: jest.SpyInstance;

const mockUseLoadFieldsByIndices = useLoadFieldsByIndices as jest.Mock;
const mockUseLLMsModels = useLLMsModels as jest.Mock;
const mockUseSearchParams = useSearchParams as jest.Mock;

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})() as Storage;

describe('FormProvider', () => {
  beforeEach(() => {
    formHookSpy = jest.spyOn(ReactHookForm, 'useForm');
    mockUseLLMsModels.mockReturnValue([]);
    mockUseLoadFieldsByIndices.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders the form provider with initial values, no default model', async () => {
    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues()).toEqual({
        doc_size: 3,
        indices: [],
        prompt: 'You are an assistant for question-answering tasks.',
        source_fields: {},
        summarization_model: undefined,
      });
    });
  });

  it('sets the default summarization model with models available', async () => {
    const mockModels = [
      { id: 'model1', name: 'Model 1', disabled: false },
      { id: 'model2', name: 'Model 2', disabled: true },
    ];

    mockUseLLMsModels.mockReturnValueOnce(mockModels);

    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    await waitFor(() => {
      expect(mockUseLoadFieldsByIndices).toHaveBeenCalled();
      const defaultModel = mockModels.find((model) => !model.disabled);
      const { getValues } = formHookSpy.mock.results[0].value;

      expect(getValues(ChatFormFields.summarizationModel)).toEqual(defaultModel);
    });
  });

  it('does not set a disabled model as the default summarization model', async () => {
    const modelsWithAllDisabled = [
      { id: 'model1', name: 'Model 1', disabled: true },
      { id: 'model2', name: 'Model 2', disabled: true },
    ];

    mockUseLLMsModels.mockReturnValueOnce(modelsWithAllDisabled);

    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    await waitFor(() => {
      expect(mockUseLoadFieldsByIndices).toHaveBeenCalled();
    });

    expect(
      formHookSpy.mock.results[0].value.getValues(ChatFormFields.summarizationModel)
    ).toBeUndefined();
  });

  it('saves form state to localStorage', async () => {
    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    const { setValue } = formHookSpy.mock.results[0].value;

    act(() => {
      setValue(ChatFormFields.prompt, 'New prompt');
      // omit question from the session state
      setValue(ChatFormFields.question, 'dont save me');
    });

    await waitFor(() => {
      expect(localStorageMock.getItem(LOCAL_STORAGE_KEY)).toEqual(
        JSON.stringify({
          prompt: 'New prompt',
          doc_size: 3,
          source_fields: {},
          indices: [],
          summarization_model: undefined,
        })
      );
    });
  });

  it('loads form state from localStorage', async () => {
    localStorageMock.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: [],
        summarization_model: undefined,
      })
    );

    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues()).toEqual({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: [],
        summarization_model: undefined,
      });
    });
  });

  it('overrides the session model to the default when not found in list', async () => {
    const mockModels = [
      { id: 'model1', name: 'Model 1', disabled: false },
      { id: 'model2', name: 'Model 2', disabled: true },
    ];

    mockUseLLMsModels.mockReturnValueOnce(mockModels);

    localStorageMock.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: [],
        summarization_model: { id: 'non-exist-model', name: 'Model 1', disabled: false },
      })
    );

    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues().summarization_model).toEqual({
        id: 'model1',
        name: 'Model 1',
        disabled: false,
      });
    });
  });

  it('updates indices from search params', async () => {
    const mockSearchParams = new URLSearchParams();
    mockSearchParams.get = jest.fn().mockReturnValue('new-index');
    mockUseSearchParams.mockReturnValue([mockSearchParams]);

    localStorageMock.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        prompt: 'Loaded prompt',
        doc_size: 3,
        source_fields: {},
        indices: ['old-index'],
        summarization_model: undefined,
      })
    );

    render(
      <FormProvider storage={localStorageMock}>
        <div>Test Child Component</div>
      </FormProvider>
    );

    const { getValues } = formHookSpy.mock.results[0].value;

    await waitFor(() => {
      expect(getValues(ChatFormFields.indices)).toEqual(['new-index']);
    });
  });
});
