/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiCodeBlock,
  EuiMarkdownFormat,
  EuiSpacer,
} from '@elastic/eui';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';
import { AgentConfigInstructions } from '../agent_config_instructions';
import {
  INSTRUCTION_VARIANT,
  AgentInstructions,
} from '../instruction_variants';
import { ApiKeySuccessCallout } from './api_key_success_callout';
import { ApiKeyErrorCallout } from './api_key_error_callout';

export const createNodeAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const { baseUrl, apmServerUrl, apiKeyDetails, loading } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.tutorial.node.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.node.install.textPre', {
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
      title: i18n.translate('xpack.apm.tutorial.node.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.node.configure.textPre', {
              defaultMessage:
                'Agents are libraries that run inside of your application process. \
 APM services are created programmatically based on the `serviceName`. \
 This agent supports a variety of frameworks but can also be used with your custom stack.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />

          {apiKeyDetails?.displayCreateApiKeyAction && (
            <>
              <EuiButton
                data-test-subj="createApiKeyAndId"
                fill
                onClick={apiKeyDetails?.createAgentKey}
                isLoading={loading}
              >
                {i18n.translate('xpack.apm.tutorial.apiKey.create', {
                  defaultMessage: 'Create API Key',
                })}
              </EuiButton>
              <EuiSpacer />
            </>
          )}
          {apiKeyDetails?.displayApiKeySuccessCallout && (
            <>
              <ApiKeySuccessCallout />
              <EuiSpacer />
            </>
          )}
          {apiKeyDetails?.displayApiKeyErrorCallout && (
            <>
              <ApiKeyErrorCallout errorMessage={apiKeyDetails?.errorMessage} />
              <EuiSpacer />
            </>
          )}

          <AgentConfigInstructions
            variantId={INSTRUCTION_VARIANT.NODE}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.node.configure.textPost', {
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
  ];
};
