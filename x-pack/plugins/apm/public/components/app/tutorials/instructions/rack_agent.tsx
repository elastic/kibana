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
import { ApiKeyErrorCallout } from './api_key_error_callout';
import { AgentConfigInstructions } from '../agent_config_instructions';
import {
  INSTRUCTION_VARIANT,
  AgentInstructions,
} from '../instruction_variants';
import { ApiKeySuccessCallout } from './api_key_success_callout';

export const createRackAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const { baseUrl, apmServerUrl, apiKeyDetails, loading } = commonOptions;
  const codeBlock = `# config.ru
  require 'sinatra/base'

  class MySinatraApp < Sinatra::Base
    use ElasticAPM::Middleware

    # ...
  end

  ElasticAPM.start(
    app: MySinatraApp, # ${i18n.translate(
      'xpack.apm.tutorial.rack.configure.commands.requiredComment',
      {
        defaultMessage: 'required',
      }
    )}
    config_file: '' # ${i18n.translate(
      'xpack.apm.tutorial.rack.configure.commands.optionalComment',
      {
        defaultMessage: 'optional, defaults to config/elastic_apm.yml',
      }
    )}
  )

  run MySinatraApp

  at_exit { ElasticAPM.stop }`;
  return [
    {
      title: i18n.translate('xpack.apm.tutorial.rack.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rack.install.textPre', {
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
      title: i18n.translate('xpack.apm.tutorial.rack.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rack.configure.textPre', {
              defaultMessage:
                'For Rack or a compatible framework (e.g. Sinatra), include the middleware in your app and start the agent.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            {codeBlock}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.tutorial.rack.createConfig.title', {
        defaultMessage: 'Create config file',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rack.createConfig.textPre', {
              defaultMessage: 'Create a config file {configFile}:',
              values: { configFile: '`config/elastic_apm.yml`' },
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
            variantId={INSTRUCTION_VARIANT.RACK}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rack.configure.textPost', {
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
