/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  copyToClipboard,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiLink,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React from 'react';
import type { ValuesType } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentApiDetails, AgentInstructions } from '../instruction_variants';
import { ApiKeyCallout } from './api_key_callout';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

export const createOpenTelemetryAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const {
    otlpManagedServiceUrl,
    apiKeyDetails,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
  } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.onboarding.otel.download.title', {
        defaultMessage: 'Instrument your app with EDOT SDK ',
      }),
      children: (
        <EuiText>
          <FormattedMessage
            id="xpack.apm.onboarding.otel.download.textPre"
            defaultMessage="For guidance on downloading and getting started with the EDOT SDKs, visit our {elasticOpenTelemetryDocLink}"
            values={{
              elasticOpenTelemetryDocLink: (
                <EuiLink
                  data-test-subj="apmCreateOpenTelemetryAgentInstructionsOtelExporterOtlpEndpointLink"
                  target="_blank"
                  href="http://ela.st/edot-sdks"
                >
                  {i18n.translate(
                    'xpack.apm.createOpenTelemetryAgentInstructions.elasticOpenTelemetryDocumentationLinkLabel',
                    { defaultMessage: 'Elastic OpenTelemetry documentation' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.apm.onboarding.otel.configureAgent.title', {
        defaultMessage: 'Send data to the Managed OTLP Endpoint (Tech Preview)',
      }),
      children: (
        <>
          <EuiMarkdownFormat>
            {i18n.translate('xpack.apm.onboarding.otel.configureAgent.textPre', {
              defaultMessage:
                'The managed OTLP endpoint provides native support for OTLP data and handles logs, metrics and traces consistently. It preserves OpenTelemetry semantic conventions and resource attributes, offering a native experience aligned with OpenTelemetry standards. This endpoint also automatically manages scalability and resiliency for your data ingestion. Note that the managed OTLP endpoint is currently in **Tech Preview.**',
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
          <OpenTelemetryInstructions
            otlpManagedServiceUrl={otlpManagedServiceUrl}
            apiKeyDetails={apiKeyDetails}
          />
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
          aria-label={i18n.translate('xpack.apm.onboarding.otel.column.value.copyIconText', {
            defaultMessage: 'Copy to clipboard',
          })}
          color="text"
          iconType="copy"
          onClick={() => copyToClipboard(value)}
        />
      )}
    </>
  );
}

export function OpenTelemetryInstructions({
  otlpManagedServiceUrl,
  secretToken,
  apiKeyDetails,
}: {
  otlpManagedServiceUrl: string;
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
      value: otlpManagedServiceUrl ? otlpManagedServiceUrl : '<otlp-managed-service-url>',
    },
    {
      setting: 'OTEL_EXPORTER_OTLP_HEADERS',
      value: authHeaderValue,
      apiKey: apiKeyDetails?.apiKey,
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
      name: i18n.translate('xpack.apm.onboarding.config_otel.column.configSettings', {
        defaultMessage: 'Configuration setting',
      }),
    },
    {
      field: 'value',
      width: '55%',
      name: i18n.translate('xpack.apm.onboarding.config_otel.column.configValue', {
        defaultMessage: 'Configuration value',
      }),
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
  ];

  return (
    <>
      <EuiBasicTable items={items} columns={columns} data-test-subj="otel-instructions-table" />
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.apm.onboarding.config_otel.description1"
          defaultMessage="OpenTelemetry agents and SDKs must support the {otelExporterOtlpEndpoint}, {otelExporterOtlpHeaders}, and {otelResourceAttributes} variables; some unstable components may not yet comply with this requirement."
          values={{
            otelExporterOtlpEndpoint: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOtelExporterOtlpEndpointLink"
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/protocol/exporter.md"
              >
                {i18n.translate(
                  'xpack.apm.openTelemetryInstructions.otelexporterotlpendpointLinkLabel',
                  { defaultMessage: 'OTEL_EXPORTER_OTLP_ENDPOINT' }
                )}
              </EuiLink>
            ),
            otelExporterOtlpHeaders: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOtelExporterOtlpHeadersLink"
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/protocol/exporter.md"
              >
                {i18n.translate(
                  'xpack.apm.openTelemetryInstructions.otelexporterotlpheadersLinkLabel',
                  { defaultMessage: 'OTEL_EXPORTER_OTLP_HEADERS' }
                )}
              </EuiLink>
            ),
            otelResourceAttributes: (
              <EuiLink
                data-test-subj="apmOpenTelemetryInstructionsOtelResourceAttributesLink"
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/resource/sdk.md"
              >
                {i18n.translate(
                  'xpack.apm.openTelemetryInstructions.otelresourceattributesLinkLabel',
                  { defaultMessage: 'OTEL_RESOURCE_ATTRIBUTES' }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
}
