/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCodeBlock, EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';
import { ApiKeyCallout } from './api_key_callout';
import { AgentConfigInstructions } from '../agent_config_instructions';
import { INSTRUCTION_VARIANT, AgentInstructions } from '../instruction_variants';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

export const createNodeAgentInstructions = (commonOptions: AgentInstructions): EuiStepProps[] => {
  const {
    baseUrl,
    apmServerUrl,
    apiKeyDetails,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
  } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.onboarding.node.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.node.install.textPre', {
              defaultMessage:
                'Install the APM agent for Node.js as a dependency to your application.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            npm install elastic-apm-node --save
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.node.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.node.configure.textPre', {
              defaultMessage:
                'Agents are libraries that run inside of your application process. \
 APM services are created programmatically based on the `serviceName`. \
 This agent supports a variety of frameworks but can also be used with your custom stack.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          {(apiKeyDetails?.displayApiKeySuccessCallout ||
            apiKeyDetails?.displayApiKeyErrorCallout) && (
            <>
              <ApiKeyCallout
                isError={apiKeyDetails?.displayApiKeyErrorCallout}
                isSuccess={apiKeyDetails?.displayApiKeySuccessCallout}
                errorMessage={apiKeyDetails?.errorMessage}
              />
              <EuiSpacer />
            </>
          )}

          <AgentConfigInstructions
            variantId={INSTRUCTION_VARIANT.NODE}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
            createApiKey={apiKeyDetails?.createAgentKey}
            createApiKeyLoading={apiKeyDetails?.createApiKeyLoading}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.node.configure.textPost', {
              defaultMessage:
                'See [the documentation]({documentationLink}) for advanced usage, including how to use with \
[Babel/ES Modules]({babelEsModulesLink}).',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/nodejs/current/index.html`,
                babelEsModulesLink: `${baseUrl}guide/en/apm/agent/nodejs/current/advanced-setup.html#es-modules`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
    agentStatusCheckInstruction({
      checkAgentStatus,
      agentStatus,
      agentStatusLoading,
    }),
  ];
};
