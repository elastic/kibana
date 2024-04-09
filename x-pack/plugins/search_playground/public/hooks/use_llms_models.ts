/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OpenAILogo } from '@kbn/stack-connectors-plugin/public/common';
import { ComponentType, useMemo } from 'react';
import { LLMs } from '../../common/types';
import { LLMModel, SummarizationModelName } from '../types';
import { useLoadConnectors } from './use_load_connectors';

const mapLlmToModels: Record<
  LLMs,
  {
    icon: ComponentType;
    getModels: (
      connectorName: string,
      includeName: boolean
    ) => Array<{ label: string; value?: string }>;
  }
> = {
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
  [LLMs.openai]: {
    icon: OpenAILogo,
    getModels: (connectorName, includeName) =>
      Object.values(SummarizationModelName).map((model) => ({
        label: `${model} ${includeName ? `(${connectorName})` : ''}`,
        value: model,
      })),
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
          ...llmParams.getModels(connector.name, false).map(({ label, value }) => ({
            id: connector?.id + label,
            name: label,
            value,
            connectorName: connector.name,
            showConnectorName,
            icon: llmParams.icon,
            disabled: !connector,
            connectorId: connector.id,
          })),
        ];
      }, []) || [],
    [connectors, mapConnectorTypeToCount]
  );
};
