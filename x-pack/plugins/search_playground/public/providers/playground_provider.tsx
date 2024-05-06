/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { ChatForm, ChatFormFields } from '../types';

const queryClient = new QueryClient({});

export interface PlaygroundProviderProps {
  children: React.ReactNode;
  defaultValues?: Partial<Pick<ChatForm, ChatFormFields.indices>>;
}

export const PlaygroundProvider: FC<PropsWithChildren<PlaygroundProviderProps>> = ({
  children,
  defaultValues,
}) => {
  const form = useForm<ChatForm>({
    defaultValues: {
      prompt: 'You are an assistant for question-answering tasks.',
      doc_size: 3,
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
