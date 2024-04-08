/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { ChatForm } from '../types';

const queryClient = new QueryClient({});

export interface PlaygroundProviderProps {
  defaultValues?: Partial<ChatForm>;
}

export const PlaygroundProvider: React.FC<PlaygroundProviderProps> = ({
  children,
  defaultValues,
}) => {
  const form = useForm<ChatForm>({
    defaultValues: {
      prompt: 'You are an assistant for question-answering tasks.',
      doc_size: 5,
      source_fields: [],
      indices: defaultValues?.indices || [],
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider {...form}>{children}</FormProvider>
    </QueryClientProvider>
  );
};
