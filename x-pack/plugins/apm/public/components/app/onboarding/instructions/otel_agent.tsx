/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  copyToClipboard,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiButtonIcon,
  EuiLink,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';
import { ValuesType } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { AgentApiDetails, AgentInstructions } from '../instruction_variants';
import { ApiKeyCallout } from './api_key_callout';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

export const createOpenTelemetryAgentInstructions = (
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
  return [
    {
      title: i18n.translate('xpack.apm.onboarding.otel.download.title', {
        defaultMessage: 'Download the OpenTelemetry APM Agent or SDK',
      }),
      children: (
        <EuiMarkdownFormat>
          {i18n.translate('xpack.apm.onboarding.otel.download.textPre', {
            defaultMessage:
              'See the [OpenTelemetry Instrumentation guides]({openTelemetryInstrumentationLink}) to download the OpenTelemetry Agent or SDK for your language.',
            values: {
              openTelemetryInstrumentationLink:
                'https://opentelemetry.io/docs/instrumentation',
            },
          })}
        </EuiMarkdownFormat>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.otel.configureAgent.title', {
        defaultMessage: 'Configure OpenTelemetry in your application',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate(
              'xpack.apm.onboarding.otel.configureAgent.textPre',
              {
                defaultMessage:
                  'Specify the following OpenTelemetry settings as part of the startup of your application. Note that OpenTelemetry SDKs require some bootstrap code in addition to these configuration settings. For more details, see the [Elastic OpenTelemetry documentation]({openTelemetryDocumentationLink}) and the [OpenTelemetry community instrumentation guides]({openTelemetryInstrumentationLink}).',
                values: {
                  openTelemetryDocumentationLink: `${baseUrl}guide/en/apm/guide/current/open-telemetry.html`,
                  openTelemetryInstrumentationLink:
                    'https://opentelemetry.io/docs/instrumentation',
                },
              }
            )}
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
          <OpenTelemetryInstructions
            apmServerUrl={apmServerUrl}
            apiKeyDetails={apiKeyDetails}
          />
          <EuiSpacer />
          <EuiMarkdownFormat>
            {i18n.translate(
              'xpack.apm.onboarding.otel.configureAgent.textPost',
              {
                defaultMessage:
                  'See the [documentation]({documentationLink}) for configuration options and advanced usage.\n\n',
                values: {
                  documentationLink: `${baseUrl}guide/en/apm/guide/current/open-telemetry.html`,
                },
              }
            )}
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

function ConfigurationValueColumn({
  setting,
  value,
  createApiKey,
  createApiKeyLoading,
  apiKey,
}: {
  setting: string;
  value: string;
  createApiKey?: () => void;
  createApiKeyLoading?: boolean;
  apiKey?: string | null;
}) {
  const shouldRenderCreateApiKeyButton =
    setting === 'OTEL_EXPORTER_OTLP_HEADERS' && apiKey === null;

  if (shouldRenderCreateApiKeyButton) {
    return (
      <EuiButton
        data-test-subj="createApiKeyAndId"
        fill
        onClick={createApiKey}
        isLoading={createApiKeyLoading}
      >
        {i18n.translate('xpack.apm.onboarding.apiKey.create', {
          defaultMessage: 'Create API Key',
        })}
      </EuiButton>
    );
  }

  return (
    <>
      <EuiText size="s" color="accent">
        {value}
      </EuiText>
      {value && (
        <EuiButtonIcon
          data-test-subj="apmConfigurationValueColumnButton"
          aria-label={i18n.translate(
            'xpack.apm.onboarding.otel.column.value.copyIconText',
            {
              defaultMessage: 'Copy to clipboard',
            }
          )}
          color="text"
          iconType="copy"
          onClick={() => copyToClipboard(value)}
        />
      )}
    </>
  );
}

export function OpenTelemetryInstructions({
  apmServerUrl,
  secretToken,
  apiKeyDetails,
}: {
  apmServerUrl: string;
  secretToken?: string;
  apiKeyDetails?: AgentApiDetails;
}) {
  let authHeaderValue;

  if (secretToken) {
    authHeaderValue = `Authorization=Bearer ${secretToken}`;
  } else {
    authHeaderValue = `Authorization=ApiKey ${apiKeyDetails?.apiKey}`;
  }
  const items = [
    {
      setting: 'OTEL_EXPORTER_OTLP_ENDPOINT',
      value: apmServerUrl ? apmServerUrl : '<apm-server-url>',
    },
    {
      setting: 'OTEL_EXPORTER_OTLP_HEADERS',
      value: authHeaderValue,
      apiKey: apiKeyDetails?.apiKey,
    },
    {
      setting: 'OTEL_METRICS_EXPORTER',
      value: 'otlp',
      notes: 'Enable metrics when supported by your OpenTelemetry client.',
    },
    {
      setting: 'OTEL_LOGS_EXPORTER',
      value: 'otlp',
      notes: 'Enable logs when supported by your OpenTelemetry client',
    },
    {
      setting: 'OTEL_RESOURCE_ATTRIBUTES',
      value:
        'service.name=<app-name>,service.version=<app-version>,deployment.environment=production',
    },
  ];

  const columns: Array<EuiBasicTableColumn<ValuesType<typeof items>>> = [
    {
      field: 'setting',
      width: '23%',
      name: i18n.translate(
        'xpack.apm.onboarding.config_otel.column.configSettings',
        {
          defaultMessage: 'Configuration setting (1)',
        }
      ),
    },
    {
      field: 'value',
      width: '55%',
      name: i18n.translate(
        'xpack.apm.onboarding.config_otel.column.configValue',
        {
          defaultMessage: 'Configuration value',
        }
      ),
      render: (_, { value, setting, apiKey }) => (
        <ConfigurationValueColumn
          setting={setting}
          value={value}
          createApiKey={apiKeyDetails?.createAgentKey}
          createApiKeyLoading={apiKeyDetails?.createApiKeyLoading}
          apiKey={apiKeyDetails?.apiKey}
        />
      ),
    },
    {
      field: 'notes',
      name: i18n.translate('xpack.apm.onboarding.config_otel.column.notes', {
        defaultMessage: 'Notes',
      }),
    },
  ];

  return (
    <>
      <EuiBasicTable
        items={items}
        columns={columns}
        data-test-subj="otel-instructions-table"
      />
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.apm.onboarding.config_otel.description1"
          defaultMessage="(1) OpenTelemetry agents and SDKs must support the {otelExporterOtlpEndpoint}, {otelExporterOtlpHeaders}, and {otelResourceAttributes} variables; some unstable components may not yet comply with this requirement."
          values={{
            otelExporterOtlpEndpoint: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOtelExporterOtlpEndpointLink"
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/protocol/exporter.md"
              >
                OTEL_EXPORTER_OTLP_ENDPOINT
              </EuiLink>
            ),
            otelExporterOtlpHeaders: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOtelExporterOtlpHeadersLink"
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/protocol/exporter.md"
              >
                OTEL_EXPORTER_OTLP_HEADERS
              </EuiLink>
            ),
            otelResourceAttributes: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOtelResourceAttributesLink"
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/resource/sdk.md"
              >
                OTEL_RESOURCE_ATTRIBUTES
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="xs" />
        <FormattedMessage
          id="xpack.apm.onboarding.config_otel.description2"
          defaultMessage="The 'OTEL_METRICS_EXPORTER` and 'OTEL_LOGS_EXPORTER' environment variables may not be supported by some SDKs."
        />
        <EuiSpacer size="xs" />
        <FormattedMessage
          id="xpack.apm.onboarding.config_otel.description3"
          defaultMessage="The exhaustive list of environment variables, command line parameters, and configuration code snippets (according to the OpenTelemetry specification) is available in the {otelInstrumentationGuide}. Some unstable OpenTelemetry clients may not support all features and may require alternate configuration mechanisms."
          values={{
            otelInstrumentationGuide: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOpenTelemetryInstrumentationGuideLink"
                target="_blank"
                href="https://opentelemetry.io/docs/instrumentation"
              >
                {i18n.translate(
                  'xpack.apm.onboarding.config_otel.instrumentationGuide',
                  {
                    defaultMessage: 'OpenTelemetry Instrumentation guide',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
}
