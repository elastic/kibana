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
import { ApiKeyCallout } from './api_key_callout';

export const createPhpAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const { baseUrl, apmServerUrl, apiKeyDetails, loading } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.tutorial.php.download.title', {
        defaultMessage: 'Download the APM agent',
      }),
      children: (
        <EuiMarkdownFormat>
          {i18n.translate('xpack.apm.tutorial.php.download.textPre', {
            defaultMessage:
              'Download the package corresponding to your platform from [GitHub releases]({githubReleasesLink}).',
            values: {
              githubReleasesLink:
                'https://github.com/elastic/apm-agent-php/releases',
            },
          })}
        </EuiMarkdownFormat>
      ),
    },
    {
      title: i18n.translate('xpack.apm.tutorial.php.installPackage.title', {
        defaultMessage: 'Install the downloaded package',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.php.installPackage.textPre', {
              defaultMessage: 'For example on Alpine Linux using APK package:',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            apk add --allow-untrusted &lt;package-file&gt;.apk
          </EuiCodeBlock>
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.php.installPackage.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for installation commands on other supported platforms and advanced installation.',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/php/current/setup.html`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.tutorial.php.configureAgent.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate(
              'xpack.apm.tutorial.php.Configure the agent.textPre',
              {
                defaultMessage:
                  'APM is automatically started when your app boots. Configure the agent either via `php.ini` file:',
              }
            )}
          </EuiMarkdownFormat>

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
            variantId={INSTRUCTION_VARIANT.PHP}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.php.configureAgent.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/php/current/configuration.html`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
  ];
};
