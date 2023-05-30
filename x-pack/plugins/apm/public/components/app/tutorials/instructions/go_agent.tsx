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

export const createGoAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const { baseUrl, apmServerUrl, apiKeyDetails, loading } = commonOptions;
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
      title: i18n.translate('xpack.apm.tutorial.go.install.title', {
        defaultMessage: 'Install the APM agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.go.install.textPre', {
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
      title: i18n.translate('xpack.apm.tutorial.go.configure.title', {
        defaultMessage: 'Configure the agent',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.go.configure.textPre', {
              defaultMessage:
                'Agents are libraries that run inside of your application process. \
APM services are created programmatically based on the executable \
file name, or the `ELASTIC_APM_SERVICE_NAME` environment variable.',
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
            variantId={INSTRUCTION_VARIANT.GO}
            apmServerUrl={apmServerUrl}
            apiKey={apiKeyDetails?.apiKey}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.go.configure.textPost', {
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
      title: i18n.translate('xpack.apm.tutorial.go.goClient.title', {
        defaultMessage: 'Instrument your application',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.tutorial.go.instrument.textPre', {
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
            {i18n.translate('xpack.apm.tutorial.go.instrument.textPost', {
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
  ];
};
