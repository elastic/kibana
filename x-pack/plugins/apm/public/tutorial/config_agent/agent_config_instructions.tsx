/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { OpenTelemetryInstructions } from './opentelemetry_instructions';
import { getApmAgentCommands } from './commands/get_apm_agent_commands';

export function AgentConfigInstructions({
  variantId,
  apmServerUrl,
  secretToken,
}: {
  variantId: string;
  apmServerUrl?: string;
  secretToken?: string;
}) {
  if (variantId === 'openTelemetry') {
    return (
      <>
        <EuiSpacer />
        <OpenTelemetryInstructions
          apmServerUrl={apmServerUrl}
          secretToken={secretToken}
        />
      </>
    );
  }

  const commands = getApmAgentCommands({
    variantId,
    policyDetails: {
      apmServerUrl,
      secretToken,
    },
  });

  return (
    <>
      <EuiSpacer />
      <EuiCodeBlock isCopyable language="bash" data-test-subj="commands">
        {commands}
      </EuiCodeBlock>
    </>
  );
}
