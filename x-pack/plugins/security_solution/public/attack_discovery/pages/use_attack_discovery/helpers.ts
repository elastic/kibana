/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceOptions } from '@kbn/elastic-assistant/impl/assistant/types';
import type { AttackDiscoveryPostRequestBody } from '@kbn/elastic-assistant-common';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { ActionConnectorProps } from '@kbn/triggers-actions-ui-plugin/public/types';
import { isEmpty } from 'lodash/fp';

// aligns with OpenAiProviderType from '@kbn/stack-connectors-plugin/common/openai/types'
enum OpenAiProviderType {
  OpenAi = 'OpenAI',
  AzureAi = 'Azure OpenAI',
  Other = 'Other',
}

interface GenAiConfig {
  apiProvider?: OpenAiProviderType;
  apiUrl?: string;
  defaultModel?: string;
}

/**
 * Returns the GenAiConfig for a given ActionConnector. Note that if the connector is preconfigured,
 * the config will be undefined as the connector is neither available nor editable.
 *
 * @param connector
 */
export const getGenAiConfig = (connector: ActionConnector | undefined): GenAiConfig | undefined => {
  if (!connector?.isPreconfigured) {
    const config = (connector as ActionConnectorProps<GenAiConfig, unknown>)?.config;
    const { apiProvider, apiUrl, defaultModel } = config ?? {};

    return {
      apiProvider,
      apiUrl,
      defaultModel:
        apiProvider === OpenAiProviderType.AzureAi
          ? getAzureApiVersionParameter(apiUrl ?? '')
          : defaultModel,
    };
  }

  return undefined; // the connector is neither available nor editable
};

const getAzureApiVersionParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  return urlSearchParams.get('api-version') ?? undefined;
};

export const getRequestBody = ({
  alertsIndexPattern,
  anonymizationFields,
  genAiConfig,
  selectedConnector,
  size,
  traceOptions,
}: {
  alertsIndexPattern: string | undefined;
  anonymizationFields: {
    page: number;
    perPage: number;
    total: number;
    data: Array<{
      id: string;
      field: string;
      timestamp?: string | undefined;
      allowed?: boolean | undefined;
      anonymized?: boolean | undefined;
      updatedAt?: string | undefined;
      updatedBy?: string | undefined;
      createdAt?: string | undefined;
      createdBy?: string | undefined;
      namespace?: string | undefined;
    }>;
  };
  genAiConfig?: GenAiConfig;
  size: number;
  selectedConnector?: ActionConnector;
  traceOptions: TraceOptions;
}): AttackDiscoveryPostRequestBody => ({
  alertsIndexPattern: alertsIndexPattern ?? '',
  anonymizationFields: anonymizationFields?.data ?? [],
  langSmithProject: isEmpty(traceOptions?.langSmithProject)
    ? undefined
    : traceOptions?.langSmithProject,
  langSmithApiKey: isEmpty(traceOptions?.langSmithApiKey)
    ? undefined
    : traceOptions?.langSmithApiKey,
  replacements: {}, // no need to re-use replacements in the current implementation
  size,
  subAction: 'invokeAI', // non-streaming
  apiConfig: {
    connectorId: selectedConnector?.id ?? '',
    actionTypeId: selectedConnector?.actionTypeId ?? '',
    provider: genAiConfig?.apiProvider,
    model: genAiConfig?.defaultModel,
  },
});
