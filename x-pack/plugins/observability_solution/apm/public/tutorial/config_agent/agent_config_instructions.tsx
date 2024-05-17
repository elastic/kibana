/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { AgentConfigurationTable } from './agent_config_table';
import {
  getApmAgentCommands,
  getApmAgentHighlightLang,
  getApmAgentLineNumbers,
  getApmAgentVariables,
} from './commands/get_apm_agent_commands';
import { OpenTelemetryInstructions } from './opentelemetry_instructions';

export function AgentConfigInstructions({
  variantId,
  apmServerUrl,
  secretToken,
}: {
  variantId: string;
  apmServerUrl?: string;
  secretToken?: string;
}) {
  const defaultValues = {
    apmServiceName: 'my-service-name',
    apmEnvironment: 'my-environment',
  };

  if (variantId === 'openTelemetry') {
    return (
      <>
        <EuiSpacer />
        <OpenTelemetryInstructions apmServerUrl={apmServerUrl} secretToken={secretToken} />
      </>
    );
  }

  const commands = getApmAgentCommands({
    variantId,
    policyDetails: {
      apmServerUrl,
      secretToken,
    },
    defaultValues,
  });

  const variables = getApmAgentVariables(variantId);
  const lineNumbers = getApmAgentLineNumbers(variantId);
  const highlightLang = getApmAgentHighlightLang(variantId);

  return (
    <>
      <EuiSpacer />
      <AgentConfigurationTable
        variables={variables}
        data={{ apmServerUrl, secretToken, ...defaultValues }}
      />
      <EuiSpacer />

      <EuiCodeBlock
        isCopyable
        language={highlightLang || 'bash'}
        data-test-subj="commands"
        lineNumbers={lineNumbers}
      >
        {commands}
      </EuiCodeBlock>
    </>
  );
}
