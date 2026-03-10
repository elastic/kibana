/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ConfigSchema } from '../../..';
import type { AgentInstructions, AgentApiKey } from './instruction_variants';
import { INSTRUCTION_VARIANT } from './instruction_variants';
import {
  createJavaAgentInstructions,
  createNodeAgentInstructions,
  createDjangoAgentInstructions,
  createFlaskAgentInstructions,
  createRailsAgentInstructions,
  createRackAgentInstructions,
  createGoAgentInstructions,
  createDotNetAgentInstructions,
  createPhpAgentInstructions,
} from './instructions';

const DEFAULT_INSTRUCTION_TITLE = i18n.translate('xpack.apm.onboarding.defaultTitle', {
  defaultMessage: 'APM Agents',
});

export function serverlessInstructions(
  {
    baseUrl,
    config,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
  }: {
    baseUrl: string;
    config: ConfigSchema;
    checkAgentStatus: () => void;
    agentStatus?: boolean;
    agentStatusLoading: boolean;
  },
  apiKeyLoading: boolean,
  apiKeyDetails: AgentApiKey,
  createAgentKey: () => void
) {
  const { apiKey, error, errorMessage } = apiKeyDetails;
  const displayApiKeySuccessCallout = Boolean(apiKey) && !error;
  const displayApiKeyErrorCallout = error && Boolean(errorMessage);
  const commonOptions: AgentInstructions = {
    baseUrl,
    apmServerUrl: `${config.managedServiceUrl}:443`,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
    apiKeyDetails: {
      ...apiKeyDetails,
      displayApiKeySuccessCallout,
      displayApiKeyErrorCallout,
      createAgentKey,
      createApiKeyLoading: apiKeyLoading,
    },
  };

  return [
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.NODE,
      instructions: createNodeAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.DJANGO,
      instructions: createDjangoAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.FLASK,
      instructions: createFlaskAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.RAILS,
      instructions: createRailsAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.RACK,
      instructions: createRackAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.GO,
      instructions: createGoAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.JAVA,
      instructions: createJavaAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.DOTNET,
      instructions: createDotNetAgentInstructions(commonOptions),
    },
    {
      title: DEFAULT_INSTRUCTION_TITLE,
      id: INSTRUCTION_VARIANT.PHP,
      instructions: createPhpAgentInstructions(commonOptions),
    },
  ];
}
