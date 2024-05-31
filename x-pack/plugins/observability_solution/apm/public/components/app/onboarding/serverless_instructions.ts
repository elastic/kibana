/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ConfigSchema } from '../../..';
import { INSTRUCTION_VARIANT, AgentInstructions, AgentApiKey } from './instruction_variants';
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
  createOpenTelemetryAgentInstructions,
} from './instructions';

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

  return {
    title: i18n.translate('xpack.apm.tutorial.apmAgents.title', {
      defaultMessage: 'APM Agents',
    }),
    instructionVariants: [
      {
        id: INSTRUCTION_VARIANT.NODE,
        instructions: createNodeAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.DJANGO,
        instructions: createDjangoAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.FLASK,
        instructions: createFlaskAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.RAILS,
        instructions: createRailsAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.RACK,
        instructions: createRackAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.GO,
        instructions: createGoAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.JAVA,
        instructions: createJavaAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.DOTNET,
        instructions: createDotNetAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.PHP,
        instructions: createPhpAgentInstructions(commonOptions),
      },
      {
        id: INSTRUCTION_VARIANT.OPEN_TELEMETRY,
        instructions: createOpenTelemetryAgentInstructions(commonOptions),
      },
    ],
  };
}
