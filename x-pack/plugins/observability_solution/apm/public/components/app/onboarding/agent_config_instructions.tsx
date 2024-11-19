/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import {
  getApmAgentCommands,
  getApmAgentVariables,
  getApmAgentLineNumbers,
  getApmAgentHighlightLang,
} from './commands/get_apm_agent_commands';
import { AgentConfigurationTable } from './agent_config_table';

export function AgentConfigInstructions({
  variantId,
  apmServerUrl,
  secretToken,
  apiKey,
  createApiKey,
  createApiKeyLoading,
}: {
  variantId: string;
  apmServerUrl: string;
  secretToken?: string;
  apiKey?: string | null;
  createApiKey?: () => void;
  createApiKeyLoading?: boolean;
}) {
  const commands = getApmAgentCommands({
    variantId,
    apmServerUrl,
    secretToken,
    apiKey,
  });

  const variables = getApmAgentVariables(variantId, secretToken);
  const lineNumbers = getApmAgentLineNumbers(variantId, apiKey);
  const highlightLang = getApmAgentHighlightLang(variantId);

  return (
    <>
      <EuiSpacer />
      <AgentConfigurationTable
        variables={variables}
        data={{ apmServerUrl, secretToken, apiKey }}
        createApiKey={createApiKey}
        createApiKeyLoading={createApiKeyLoading}
      />
      <EuiSpacer />

      <EuiCodeBlock
        isCopyable
        language={highlightLang || 'bash'}
        data-test-subj="commands"
        lineNumbers={lineNumbers}
        whiteSpace="pre"
      >
        {commands}
      </EuiCodeBlock>
    </>
  );
}
