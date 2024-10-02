/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { FormProvider } from './form_provider';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';
import { useLLMsModels } from '../hooks/use_llms_models';
import * as ReactHookForm from 'react-hook-form';
import { ChatFormFields } from '../types';

jest.mock('../hooks/use_load_fields_by_indices');
jest.mock('../hooks/use_llms_models');
jest.mock('react-router-dom-v5-compat', () => ({
  useSearchParams: jest.fn(() => [{ get: jest.fn() }]),
}));

let formHookSpy: jest.SpyInstance;

const mockUseLoadFieldsByIndices = useLoadFieldsByIndices as jest.Mock;
const mockUseLLMsModels = useLLMsModels as jest.Mock;

describe('FormProvider', () => {
  beforeEach(() => {
    formHookSpy = jest.spyOn(ReactHookForm, 'useForm');
    mockUseLLMsModels.mockReturnValue([]);
    mockUseLoadFieldsByIndices.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form provider with initial values, no default model', async () => {
    render(
      <FormProvider>
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
      <FormProvider>
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
      <FormProvider>
        <div>Test Child Component</div>
      </FormProvider>
    );

    await waitFor(() => {
      expect(mockUseLoadFieldsByIndices).toHaveBeenCalled();
      expect(modelsWithAllDisabled.find((model) => !model.disabled)).toBeUndefined();
    });
  });
});
