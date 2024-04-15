/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OpenAILogo } from '@kbn/stack-connectors-plugin/public/common';
import { ComponentType } from 'react';
import { LLMs } from '../../common/types';
import { LLMModel, SummarizationModelName } from '../types';
import { useLoadConnectors } from './use_load_connectors';

const llmModels: Array<{
  llm: LLMs;
  icon: ComponentType;
  models: Array<{ label: string; value?: string }>;
}> = [
  {
    llm: LLMs.openai_azure,
    icon: OpenAILogo,
    models: [
      {
        label: i18n.translate('xpack.searchPlayground.openAIAzureModel', {
          defaultMessage: 'Azure OpenAI',
        }),
      },
    ],
  },
  {
    llm: LLMs.openai,
    icon: OpenAILogo,
    models: Object.values(SummarizationModelName).map((model) => ({ label: model, value: model })),
  },
];

export const useLLMsModels = (): LLMModel[] => {
  const { data: connectors } = useLoadConnectors();

  return llmModels.reduce<LLMModel[]>(
    (result, { llm, icon, models }) => [
      ...result,
      ...models.map(({ label, value }) => ({
        name: label,
        value,
        icon,
        disabled: !connectors?.[llm],
        connectorId: connectors?.[llm]?.id,
      })),
    ],
    []
  );
};
