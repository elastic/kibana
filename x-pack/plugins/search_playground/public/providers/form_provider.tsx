/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FormProvider as ReactHookFormProvider, useForm } from 'react-hook-form';
import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom-v5-compat';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';
import { ChatForm, ChatFormFields } from '../types';
import { useLLMsModels } from '../hooks/use_llms_models';

export const FormProvider: React.FC = ({ children }) => {
  const models = useLLMsModels();
  const [searchParams] = useSearchParams();
  const index = useMemo(() => searchParams.get('default-index'), [searchParams]);
  const form = useForm<ChatForm>({
    defaultValues: {
      prompt: 'You are an assistant for question-answering tasks.',
      doc_size: 3,
      source_fields: {},
      indices: index ? [index] : [],
      summarization_model: undefined,
    },
  });
  useLoadFieldsByIndices({ watch: form.watch, setValue: form.setValue, getValues: form.getValues });

  useEffect(() => {
    const defaultModel = models.find((model) => !model.disabled);

    if (defaultModel && !form.getValues(ChatFormFields.summarizationModel)) {
      form.setValue(ChatFormFields.summarizationModel, defaultModel);
    }
  }, [form, models]);

  return <ReactHookFormProvider {...form}>{children}</ReactHookFormProvider>;
};
