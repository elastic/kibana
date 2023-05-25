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

export const createRailsAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const {
    baseUrl,
    apmServerUrl,
    createAgentKey,
    apiKeyAndId,
    displayCreateApiKeyAction,
  } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.tutorial.rails.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rails.install.textPre', {
              defaultMessage: 'Add the agent to your Gemfile.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            gem &apos;elastic-apm&apos;
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.tutorial.rails.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rails.configure.textPre', {
              defaultMessage:
                'APM is automatically started when your app boots. Configure the agent, by creating the config file {configFile}',
              values: { configFile: '`config/elastic_apm.yml`' },
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />

          {displayCreateApiKeyAction && (
            <>
              <EuiButton
                data-test-subj="createApiKeyAndId"
                fill
                onClick={createAgentKey}
              >
                {i18n.translate('xpack.apm.tutorial.apiKey.create', {
                  defaultMessage: 'Create API Key',
                })}
              </EuiButton>
              <EuiSpacer />
            </>
          )}
          <AgentConfigInstructions
            variantId={INSTRUCTION_VARIANT.RAILS}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyAndId?.apiKey}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rails.configure.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/ruby/current/index.html`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
  ];
};
