/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BedrockLogo, OpenAILogo } from '@kbn/stack-connectors-plugin/public/common';
import { ComponentType, useMemo } from 'react';
import { LLMs } from '../../common/types';
import { LLMModel } from '../types';
import { useLoadConnectors } from './use_load_connectors';

const mapLlmToModels: Record<
  LLMs,
  {
    icon: ComponentType;
    models: Array<{ label: string; value?: string }>;
  }
> = {
  [LLMs.bedrock]: {
    icon: BedrockLogo,
    models: [
      {
        label: 'Claude 3 Haiku',
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
      {
        label: 'Claude 3 Sonnet',
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
      },
    ],
  },
  [LLMs.openai_azure]: {
    icon: OpenAILogo,
    models: [
      {
        label: i18n.translate('xpack.searchPlayground.openAIAzureModel', {
          defaultMessage: 'Azure OpenAI',
        }),
      },
    ],
  },
  [LLMs.openai]: {
    icon: OpenAILogo,
    models: ['gpt-3.5-turbo', 'gpt-4'].map((model) => ({
      label: model,
      value: model,
    })),
  },
};
const orderLLMs = [LLMs.bedrock, LLMs.openai_azure, LLMs.openai];

export const useLLMsModels = (): LLMModel[] => {
  const { data: connectors } = useLoadConnectors();

  const mapConnectorTypeToCount = useMemo(
    () =>
      connectors?.reduce<Partial<Record<LLMs, number>>>(
        (result, connector) => ({
          ...result,
          [connector.type]: (result[connector.type] || 0) + 1,
        }),
        {}
      ),
    [connectors]
  );

  connectors?.sort((a, b) => orderLLMs.indexOf(a.type) - orderLLMs.indexOf(b.type));

  return useMemo(
    () =>
      connectors?.reduce<LLMModel[]>((result, connector) => {
        const llmParams = mapLlmToModels[connector.type];

        if (!llmParams) {
          return result;
        }

        return [
          ...result,
          ...llmParams.models.map(({ label, value }) => ({
            id: connector?.id + label,
            name: label,
            value,
            connectorName: connector.name,
            showConnectorName: Number(mapConnectorTypeToCount?.[connector.type]) > 1,
            icon: llmParams.icon,
            disabled: !connector,
            connectorId: connector.id,
          })),
        ];
      }, []) || [],
    [connectors, mapConnectorTypeToCount]
  );
};
