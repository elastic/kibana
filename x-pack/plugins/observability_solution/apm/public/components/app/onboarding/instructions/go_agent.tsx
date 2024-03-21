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
import {
  INSTRUCTION_VARIANT,
  AgentInstructions,
} from '../instruction_variants';
import { ApiKeyCallout } from './api_key_callout';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

export const createGoAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const {
    baseUrl,
    apmServerUrl,
    apiKeyDetails,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
  } = commonOptions;
  const codeBlock = `\
import (
  "net/http"

  "go.elastic.co/apm/module/apmhttp"
)

func main() {
  mux := http.NewServeMux()
  ...
  http.ListenAndServe(":8080", apmhttp.Wrap(mux))
}
`;
  return [
    {
      title: i18n.translate('xpack.apm.onboarding.go.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.go.install.textPre', {
              defaultMessage: 'Install the APM agent packages for Go.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="bash" isCopyable={true}>
            go get go.elastic.co/apm
          </EuiCodeBlock>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.go.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.go.configure.textPre', {
              defaultMessage:
                'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the executable \
file name, or the `ELASTIC_APM_SERVICE_NAME` environment variable.',
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
            variantId={INSTRUCTION_VARIANT.GO}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
            createApiKey={apiKeyDetails?.createAgentKey}
            createApiKeyLoading={apiKeyDetails?.createApiKeyLoading}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.go.configure.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for advanced configuration.',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/go/current/configuration.html`,
              },
            })}
          </EuiMarkdownFormat>
        </>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.go.goClient.title', {
        defaultMessage: 'Instrument your application',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.go.instrument.textPre', {
              defaultMessage:
                'Instrument your Go application by using one of the provided instrumentation modules or \
by using the tracer API directly.',
            })}
          </EuiMarkdownFormat>
          <EuiSpacer />
          <EuiCodeBlock language="go" isCopyable={true}>
            {codeBlock}
          </EuiCodeBlock>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.go.instrument.textPost', {
              defaultMessage:
                'See the [documentation]({documentationLink}) for a detailed \
guide to instrumenting Go source code.',
              values: {
                documentationLink: `${baseUrl}guide/en/apm/agent/go/current/instrumenting-source.html`,
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
