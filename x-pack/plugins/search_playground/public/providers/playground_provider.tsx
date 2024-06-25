/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useLLMsModels } from '../hooks/use_llms_models';
import { ChatForm, ChatFormFields } from '../types';

export const PlaygroundProvider: FC = ({ children }) => {
  const models = useLLMsModels();
  const form = useForm<ChatForm>({
    defaultValues: {
      prompt: 'You are an assistant for question-answering tasks.',
      doc_size: 3,
      source_fields: {},
      indices: [],
      summarization_model: {},
    },
  });

  useEffect(() => {
    const defaultModel = models.find((model) => !model.disabled);

    if (defaultModel) {
      form.setValue(ChatFormFields.summarizationModel, defaultModel);
    }
  }, [form, models]);

  return <FormProvider {...form}>{children}</FormProvider>;
};
