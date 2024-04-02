/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { ChatForm, SummarizationModelName } from '../types';

const queryClient = new QueryClient({});

export const PlaygroundProvider: React.FC = ({ children }) => {
  const form = useForm<ChatForm>({
    defaultValues: {
      prompt: 'You are an assistant for question-answering tasks.',
      docSize: 5,
      source_fields: [],
      summarization_model: SummarizationModelName.gpt3_5_turbo_16k,
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...form}>{children}</FormProvider>
    </QueryClientProvider>
  );
};
