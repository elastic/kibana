/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiMarkdownFormat, EuiSpacer } from '@elastic/eui';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';
import { AgentConfigInstructions } from '../agent_config_instructions';
import { INSTRUCTION_VARIANT, AgentInstructions } from '../instruction_variants';
import { ApiKeyCallout } from './api_key_callout';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

export const createJavaAgentInstructions = (commonOptions: AgentInstructions): EuiStepProps[] => {
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
      title: i18n.translate('xpack.apm.onboarding.java.download.title', {
        defaultMessage: 'Download the APM agent',
      }),
      children: (
        <EuiMarkdownFormat>
          {i18n.translate('xpack.apm.onboarding.java.download.textPre', {
            defaultMessage:
              'Download the agent jar from [Maven Central]({mavenCentralLink}). \
      Do **not** add the agent as a dependency to your application.',
            values: {
              mavenCentralLink:
                'https://oss.sonatype.org/service/local/artifact/maven/redirect?r=releases&g=co.elastic.apm&a=elastic-apm-agent&v=LATEST',
            },
          })}
        </EuiMarkdownFormat>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.java.startApplication.title', {
        defaultMessage: 'Start your application with the javaagent flag',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.java.startApplication.textPre', {
              defaultMessage:
                'Add the `-javaagent` flag and configure the agent with system properties.\n\n \
* Set the required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)\n \
* Set the custom APM Server URL (default: {customApmServerUrl})\n \
* Set the APM Server secret token\n \
* Set the service environment\n \
* Set the base package of your application',
              values: { customApmServerUrl: 'http://localhost:8200' },
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
            variantId={INSTRUCTION_VARIANT.JAVA}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
            createApiKey={apiKeyDetails?.createAgentKey}
            createApiKeyLoading={apiKeyDetails?.createApiKeyLoading}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.java.startApplication.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for configuration options and advanced \
        usage.',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/java/current/index.html`,
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
