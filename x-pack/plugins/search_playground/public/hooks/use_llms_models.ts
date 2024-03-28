/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAILogo } from '@kbn/stack-connectors-plugin/public/common';
import { ComponentType } from 'react';
import { LLMs } from '../../common/types';
import { LLMModel, SummarizationModelName } from '../types';
import { useLoadConnectors } from './use_load_connectors';

const llmModels: Array<{ llm: LLMs; icon: ComponentType; models: string[] }> = [
  {
    llm: LLMs.openai,
    icon: OpenAILogo,
    models: Object.values(SummarizationModelName),
  },
];

export const useLLMsModels = (): LLMModel[] => {
  const { data: connectors } = useLoadConnectors();

  return llmModels.reduce<LLMModel[]>(
    (result, { llm, icon, models }) => [
      ...result,
      ...models.map((model) => ({
        name: model,
        icon,
        disabled: !connectors?.[llm],
        connectorId: connectors?.[llm]?.id,
      })),
    ],
    []
  );
};
