/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  copyToClipboard,
  EuiCallOut,
} from '@elastic/eui';
import {
  getApmAgentCommands,
  getApmAgentVariables,
  getApmAgentLineNumbers,
  getApmAgentHighlightLang,
} from './commands/get_apm_agent_commands';
import { AgentConfigurationTable } from './agent_config_table';

const API_KEY_COMMAND_PLACEHOLDER = '<API_KEY>';
const SECRET_TOKEN_COMMAND_PLACEHOLDER = '<SECRET_TOKEN>';

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
    secretToken: `${SECRET_TOKEN_COMMAND_PLACEHOLDER}`,
    apiKey: ` ${API_KEY_COMMAND_PLACEHOLDER}`,
  });
  const commandsWithSecrets = getApmAgentCommands({
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
          <EuiFlexItem grow={1}>
            <EuiCodeBlock
              copyAriaLabel={i18n.translate(
                'xpack.apm.onboarding.agentConfigInstructions.euiCodeBlock.copyAriaLabel',
                {
                  defaultMessage: 'Copy {variantId} agent configuration code',
                  values: { variantId },
                }
              )}
              language={highlightLang || 'bash'}
              data-test-subj="commands"
              lineNumbers={lineNumbers}
              whiteSpace="pre"
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
