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
import { AgentConfigInstructions } from '../agent_config_instructions';
import { INSTRUCTION_VARIANT } from '../instruction_variants';

export const createRackAgentInstructions = (
  baseUrl: string
): EuiStepProps[] => {
  const codeBlock = `# config.ru
  require 'sinatra/base'

  class MySinatraApp < Sinatra::Base
    use ElasticAPM::Middleware

    # ...
  end

  ElasticAPM.start(
    app: MySinatraApp, # ${i18n.translate(
      'xpack.apm.tutorial.rackClient.configure.commands.requiredComment',
      {
        defaultMessage: 'required',
      }
    )}
    config_file: '' # ${i18n.translate(
      'xpack.apm.tutorial.rackClient.configure.commands.optionalComment',
      {
        defaultMessage: 'optional, defaults to config/elastic_apm.yml',
      }
    )}
  )

  run MySinatraApp

  at_exit { ElasticAPM.stop }`;
  return [
    {
      title: i18n.translate('xpack.apm.tutorial.rackClient.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rackClient.install.textPre', {
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
      title: i18n.translate('xpack.apm.tutorial.rackClient.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.rackClient.configure.textPre', {
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
      title: i18n.translate(
        'xpack.apm.tutorial.rackClient.createConfig.title',
        {
          defaultMessage: 'Create config file',
        }
      ),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate(
              'xpack.apm.tutorial.rackClient.createConfig.textPre',
              {
                defaultMessage: 'Create a config file {configFile}:',
                values: { configFile: '`config/elastic_apm.yml`' },
              }
            )}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <AgentConfigInstructions
            variantId={INSTRUCTION_VARIANT.RACK}
            apmServerUrl="achyut"
            secretToken="tug"
            apiKey="tugKey"
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate(
              'xpack.apm.tutorial.rackClient.configure.textPost',
              {
                defaultMessage:
                  'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
                values: {
                  documentationLink: `${baseUrl}guide/en/apm/agent/ruby/current/index.html`,
                },
              }
            )}
          </EuiMarkdownFormat>
        </>
      ),
    },
  ];
};
