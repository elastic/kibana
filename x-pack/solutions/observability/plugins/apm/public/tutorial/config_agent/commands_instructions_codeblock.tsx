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
import type { LineNumbers } from './commands/get_apm_agent_commands';

export function CommandsInstructionsCodeblock({
  variantId,
  lineNumbers,
  highlightLang,
  commands,
  commandsWithSecrets,
}: {
  variantId: string;
  lineNumbers: LineNumbers;
  highlightLang: string;
  commands: string;
  commandsWithSecrets: string;
}) {
  return (
    <>
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
