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
    getModels: (
      connectorName: string,
      includeName: boolean
    ) => Array<{ label: string; value?: string; promptTokenLimit?: number }>;
  }
> = {
  [LLMs.openai]: {
    icon: OpenAILogo,
    getModels: (connectorName, includeName) =>
      [
        {
          model: 'gpt-3.5-turbo',
          limit: 16385,
        },
        { model: 'gpt-4o', limit: 128000 },
        { model: 'gpt-4-turbo', limit: 128000 },
      ].map((model) => ({
        label: `${model.model} ${includeName ? `(${connectorName})` : ''}`,
        value: model.model,
        promptTokenLimit: model.limit,
      })),
  },
  [LLMs.openai_azure]: {
    icon: OpenAILogo,
    getModels: (connectorName, includeName) => [
      {
        label: i18n.translate('xpack.searchPlayground.openAIAzureModel', {
          defaultMessage: 'Azure OpenAI {name}',
          values: { name: includeName ? `(${connectorName})` : '' },
        }),
      },
    ],
  },
  [LLMs.bedrock]: {
    icon: BedrockLogo,
    getModels: () => [
      {
        label: 'Claude 3 Haiku',
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
        promptTokenLimit: 200000,
      },
      {
        label: 'Claude 3 Sonnet',
        value: 'anthropic.claude-3-haiku-20240307-v1:0',
        promptTokenLimit: 200000,
      },
    ],
  },
};

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

  return useMemo(
    () =>
      connectors?.reduce<LLMModel[]>((result, connector) => {
        const llmParams = mapLlmToModels[connector.type];

        if (!llmParams) {
          return result;
        }

        const showConnectorName = Number(mapConnectorTypeToCount?.[connector.type]) > 1;

        return [
          ...result,
          ...llmParams
            .getModels(connector.name, false)
            .map(({ label, value, promptTokenLimit }) => ({
              id: connector?.id + label,
              name: label,
              value,
              connectorType: connector.type,
              connectorName: connector.name,
              showConnectorName,
              icon: llmParams.icon,
              disabled: !connector,
              connectorId: connector.id,
              promptTokenLimit,
            })),
        ];
      }, []) || [],
    [connectors, mapConnectorTypeToCount]
  );
};
