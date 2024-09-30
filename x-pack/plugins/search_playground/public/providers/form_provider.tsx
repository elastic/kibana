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

type PartialChatForm = Partial<ChatForm>;
export const LOCAL_STORAGE_KEY = 'search_playground_session';

const DEFAULT_FORM_VALUES: PartialChatForm = {
  prompt: 'You are an assistant for question-answering tasks.',
  doc_size: 3,
  source_fields: {},
  indices: [],
  summarization_model: undefined,
};

const getLocalSession = (storage: Storage): PartialChatForm => {
  try {
    const localSessionJSON = storage.getItem(LOCAL_STORAGE_KEY);
    const sessionState = localSessionJSON ? JSON.parse(localSessionJSON) : {};

    return {
      ...DEFAULT_FORM_VALUES,
      ...sessionState,
    };
  } catch (e) {
    return DEFAULT_FORM_VALUES;
  }
};

const setLocalSession = (formState: PartialChatForm, storage: Storage) => {
  // omit question and search_query from the session state
  const { question, search_query: searchQuery, ...state } = formState;

  storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

interface FormProviderProps {
  storage?: Storage;
}

export const FormProvider: React.FC<React.PropsWithChildren<FormProviderProps>> = ({
  children,
  storage = localStorage,
}) => {
  const models = useLLMsModels();
  const [searchParams] = useSearchParams();
  const index = useMemo(() => searchParams.get('default-index'), [searchParams]);
  const sessionState = useMemo(() => getLocalSession(storage), [storage]);
  const form = useForm<ChatForm>({
    defaultValues: {
      ...sessionState,
      indices: index ? [index] : sessionState.indices,
      search_query: '',
    },
  });
  useLoadFieldsByIndices({ watch: form.watch, setValue: form.setValue, getValues: form.getValues });

  useEffect(() => {
    const subscription = form.watch((values) =>
      setLocalSession(values as Partial<ChatForm>, storage)
    );
    return () => subscription.unsubscribe();
  }, [form, storage]);

  useEffect(() => {
    const defaultModel = models.find((model) => !model.disabled);
    const currentModel = form.getValues(ChatFormFields.summarizationModel);

    if (defaultModel && (!currentModel || !models.find((model) => currentModel.id === model.id))) {
      form.setValue(ChatFormFields.summarizationModel, defaultModel);
    }
  }, [form, models]);

  return <ReactHookFormProvider {...form}>{children}</ReactHookFormProvider>;
};
