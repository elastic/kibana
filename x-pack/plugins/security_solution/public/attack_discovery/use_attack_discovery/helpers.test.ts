/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { omit } from 'lodash/fp';

import { getGenAiConfig, getRequestBody } from './helpers';

const connector: ActionConnector = {
  actionTypeId: '.gen-ai',
  config: {
    apiProvider: 'Azure OpenAI',
    apiUrl:
      'https://example.com/openai/deployments/example/chat/completions?api-version=2024-02-15-preview',
  },
  id: '15b4f8df-e2ca-4060-81a1-3bd2a2bffc7e',
  isDeprecated: false,
  isMissingSecrets: false,
  isPreconfigured: false,
  isSystemAction: false,
  name: 'Azure OpenAI GPT-4o',
  secrets: { secretTextField: 'a secret' },
};

describe('getGenAiConfig', () => {
  it('returns undefined when the connector is preconfigured', () => {
    const preconfigured = {
      ...connector,
      isPreconfigured: true,
    };

    const result = getGenAiConfig(preconfigured);

    expect(result).toBeUndefined();
  });

  it('returns the expected GenAiConfig when the connector is NOT preconfigured', () => {
    const result = getGenAiConfig(connector);

    expect(result).toEqual({
      apiProvider: connector.config.apiProvider,
      apiUrl: connector.config.apiUrl,
      defaultModel: '2024-02-15-preview',
    });
  });

  it('returns the expected defaultModel for Azure OpenAI', () => {
    const result = getGenAiConfig(connector);

    expect(result).toEqual({
      apiProvider: connector.config.apiProvider,
      apiUrl: connector.config.apiUrl,
      defaultModel: '2024-02-15-preview',
    });
  });

  it('returns the an undefined defaultModel for NON-Azure OpenAI when the config does NOT include a default model', () => {
    const apiProvider = 'OpenAI'; // <-- NON-Azure OpenAI
    const openAiConnector = {
      ...connector,
      config: {
        ...connector.config,
        apiProvider,
        // config does NOT have a default model
      },
    };

    const result = getGenAiConfig(openAiConnector);

    expect(result).toEqual({
      apiProvider,
      apiUrl: connector.config.apiUrl,
      defaultModel: undefined, // <-- because the config does not have a default model
    });
  });

  it('returns the expected defaultModel for NON-Azure OpenAi when the config has a default model', () => {
    const apiProvider = 'OpenAI'; // <-- NON-Azure OpenAI
    const withDefaultModel = {
      ...connector,
      config: {
        ...connector.config,
        apiProvider,
        defaultModel: 'aDefaultModel', // <-- default model is specified
      },
    };

    const result = getGenAiConfig(withDefaultModel);

    expect(result).toEqual({
      apiProvider,
      apiUrl: connector.config.apiUrl,
      defaultModel: 'aDefaultModel',
    });
  });

  it('returns the expected GenAiConfig when the connector config is undefined', () => {
    const connectorWithoutConfig = omit('config', connector) as ActionConnector<
      Record<string, unknown>,
      Record<string, unknown>
    >;

    const result = getGenAiConfig(connectorWithoutConfig);

    expect(result).toEqual({
      apiProvider: undefined,
      apiUrl: undefined,
      defaultModel: undefined,
    });
  });
});

describe('getRequestBody', () => {
  const alertsIndexPattern = 'test-index-pattern';
  const anonymizationFields = {
    page: 1,
    perPage: 10,
    total: 100,
    data: [
      {
        id: '1',
        field: 'field1',
      },
      {
        id: '2',
        field: 'field2',
      },
    ],
  };
  const knowledgeBase = {
    isEnabledKnowledgeBase: true,
    isEnabledRAGAlerts: true,
    latestAlerts: 20,
  };
  const traceOptions = {
    apmUrl: '/app/apm',
    langSmithProject: '',
    langSmithApiKey: '',
  };

  it('returns the expected AttackDiscoveryPostRequestBody', () => {
    const result = getRequestBody({
      alertsIndexPattern,
      anonymizationFields,
      knowledgeBase,
      traceOptions,
    });

    expect(result).toEqual({
      alertsIndexPattern,
      anonymizationFields: anonymizationFields.data,
      apiConfig: {
        actionTypeId: '',
        connectorId: '',
        model: undefined,
        provider: undefined,
      },
      langSmithProject: undefined,
      langSmithApiKey: undefined,
      size: knowledgeBase.latestAlerts,
      replacements: {},
      subAction: 'invokeAI',
    });
  });

  it('returns the expected AttackDiscoveryPostRequestBody when alertsIndexPattern is undefined', () => {
    const result = getRequestBody({
      alertsIndexPattern: undefined,
      anonymizationFields,
      knowledgeBase,
      traceOptions,
    });

    expect(result).toEqual({
      alertsIndexPattern: '',
      anonymizationFields: anonymizationFields.data,
      apiConfig: {
        actionTypeId: '',
        connectorId: '',
        model: undefined,
        provider: undefined,
      },
      langSmithProject: undefined,
      langSmithApiKey: undefined,
      size: knowledgeBase.latestAlerts,
      replacements: {},
      subAction: 'invokeAI',
    });
  });

  it('returns the expected AttackDiscoveryPostRequestBody when LangSmith details are provided', () => {
    const withLangSmith = {
      alertsIndexPattern,
      anonymizationFields,
      knowledgeBase,
      traceOptions: {
        apmUrl: '/app/apm',
        langSmithProject: 'A project',
        langSmithApiKey: 'an API key',
      },
    };

    const result = getRequestBody(withLangSmith);

    expect(result).toEqual({
      alertsIndexPattern,
      anonymizationFields: anonymizationFields.data,
      apiConfig: {
        actionTypeId: '',
        connectorId: '',
        model: undefined,
        provider: undefined,
      },
      langSmithApiKey: withLangSmith.traceOptions.langSmithApiKey,
      langSmithProject: withLangSmith.traceOptions.langSmithProject,
      size: knowledgeBase.latestAlerts,
      replacements: {},
      subAction: 'invokeAI',
    });
  });

  it('returns the expected AttackDiscoveryPostRequestBody with the expected apiConfig when selectedConnector is provided', () => {
    const result = getRequestBody({
      alertsIndexPattern,
      anonymizationFields,
      knowledgeBase,
      selectedConnector: connector, // <-- selectedConnector is provided
      traceOptions,
    });

    expect(result).toEqual({
      alertsIndexPattern,
      anonymizationFields: anonymizationFields.data,
      apiConfig: {
        actionTypeId: connector.actionTypeId,
        connectorId: connector.id,
        model: undefined,
        provider: undefined,
      },
      langSmithProject: undefined,
      langSmithApiKey: undefined,
      size: knowledgeBase.latestAlerts,
      replacements: {},
      subAction: 'invokeAI',
    });
  });

  it('returns the expected AttackDiscoveryPostRequestBody with the expected apiConfig when genAiConfig is provided', () => {
    const genAiConfig = {
      apiProvider: OpenAiProviderType.AzureAi,
      defaultModel: '2024-02-15-preview',
    };

    const result = getRequestBody({
      alertsIndexPattern,
      anonymizationFields,
      genAiConfig, // <-- genAiConfig is provided
      knowledgeBase,
      selectedConnector: connector, // <-- selectedConnector is provided
      traceOptions,
    });

    expect(result).toEqual({
      alertsIndexPattern,
      anonymizationFields: anonymizationFields.data,
      apiConfig: {
        actionTypeId: connector.actionTypeId,
        connectorId: connector.id,
        model: genAiConfig.defaultModel,
        provider: genAiConfig.apiProvider,
      },
      langSmithProject: undefined,
      langSmithApiKey: undefined,
      size: knowledgeBase.latestAlerts,
      replacements: {},
      subAction: 'invokeAI',
    });
  });
});
