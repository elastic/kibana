/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  copyToClipboard,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { OpenTelemetryInstructions } from './opentelemetry_instructions';
import {
  getApmAgentCommands,
  getApmAgentVariables,
  getApmAgentLineNumbers,
  getApmAgentHighlightLang,
} from './commands/get_apm_agent_commands';
import { AgentConfigurationTable } from './agent_config_table';

const SECRET_TOKEN_COMMAND_PLACEHOLDER = '<SECRET_TOKEN>';

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
      secretToken: `${SECRET_TOKEN_COMMAND_PLACEHOLDER}`,
    },
    defaultValues,
  });

  const commandsWithSecrets = getApmAgentCommands({
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
      <EuiCallOut
        title={i18n.translate('xpack.apm.onboarding.agentConfigInstructions.callout.title', {
          defaultMessage: `The command below doesn't show secrets values`,
        })}
        color="warning"
        iconType="warning"
      >
        <p>
          {i18n.translate('xpack.apm.onboarding.agentConfigInstructions.callout.body', {
            defaultMessage: 'Copy to clipboard to get the full command with secrets',
          })}
        </p>
      </EuiCallOut>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiCodeBlock
              copyAriaLabel={i18n.translate(
                'xpack.apm.tutorial.apmAgents.agentConfigurationInstructions.copyAriaLabel',
                {
                  defaultMessage: 'Copy {variantId} agent configuration code',
                  values: { variantId },
                }
              )}
              language={highlightLang || 'bash'}
              data-test-subj="commands"
              lineNumbers={lineNumbers}
            >
              {commands}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="apmAgentConfigInstructionsButton"
              aria-label={i18n.translate('xpack.apm.agentConfigInstructions.button.ariaLabel', {
                defaultMessage: 'Copy commands',
              })}
              iconType="copyClipboard"
              onClick={() => {
                copyToClipboard(commandsWithSecrets);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
}
