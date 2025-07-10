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
  EuiButtonGroup,
  EuiButtonIcon,
  EuiLink,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';
import React, { useState } from 'react';
import type { ValuesType } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentApiDetails, AgentInstructions } from '../instruction_variants';
import { ApiKeyCallout } from './api_key_callout';
import { agentStatusCheckInstruction } from '../agent_status_instructions';

type SDKInstructionsOptionID = 'apm' | 'otlp';

export const createOpenTelemetryAgentInstructions = (
  commonOptions: AgentInstructions
): EuiStepProps[] => {
  const {
    apmServerUrl,
    otlpManagedServiceUrl,
    apiKeyDetails,
    checkAgentStatus,
    agentStatus,
    agentStatusLoading,
  } = commonOptions;
  return [
    {
      title: i18n.translate('xpack.apm.onboarding.otel.download.title', {
        defaultMessage: 'Instrument your app with OpenTelemetry SDK',
      }),
      children: (
        <EuiText>
          <FormattedMessage
            id="xpack.apm.onboarding.otel.download.textPre"
            defaultMessage="For guidance on downloading and getting started with the OpenTelemetry SDK or Elastic Distribution of OpenTelemetry (EDOT) SDK, either review the {openTelemetryDocLink} or see the {edotDocLink}."
            values={{
              openTelemetryDocLink: (
                <EuiLink
                  data-test-subj="apmCreateOpenTelemetryAgentInstructionsOpenTelemetryDocumentationLink"
                  target="_blank"
                  href="https://opentelemetry.io/docs/instrumentation"
                >
                  {i18n.translate(
                    'xpack.apm.createOpenTelemetryAgentInstructions.openTelemetryDocumentationLinkLabel',
                    { defaultMessage: 'OpenTelemetry documentation' }
                  )}
                </EuiLink>
              ),
              edotDocLink: (
                <EuiLink
                  data-test-subj="apmCreateOpenTelemetryAgentInstructionsEDOTDocsLink"
                  target="_blank"
                  href="http://ela.st/edot-sdks"
                >
                  {i18n.translate(
                    'xpack.apm.createOpenTelemetryAgentInstructions.EDOTDocumentationLinkLabel',
                    { defaultMessage: 'EDOT documentation' }
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
        defaultMessage: 'Configure the OpenTelemetry SDK',
      }),
      children: (
        <ConfigureSDKInstructions
          apmServerUrl={apmServerUrl}
          otlpManagedServiceUrl={otlpManagedServiceUrl}
          apiKeyDetails={apiKeyDetails}
        />
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

function ConfigureSDKInstructions({
  otlpManagedServiceUrl,
  apmServerUrl,
  apiKeyDetails,
}: {
  otlpManagedServiceUrl: string;
  apmServerUrl: string;
  apiKeyDetails?: AgentApiDetails;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState<SDKInstructionsOptionID>('apm');

  return (
    <>
      <EuiButtonGroup
        legend="Default single select button group"
        options={[
          { id: 'apm', label: 'Classic APM Endpoint' },
          {
            id: 'otlp',
            label: 'Managed OTLP Endpoint',
            iconType: 'beaker',
            iconSide: 'right',
            toolTipContent: (
              <FormattedMessage
                id="xpack.apm.onboarding.otel.managedOtlpEndpointTooltip"
                defaultMessage="This functionality is in Tech Preview."
              />
            ),
            toolTipProps: { position: 'right' },
          },
        ]}
        idSelected={selectedOptionId}
        onChange={(id) => setSelectedOptionId(id as SDKInstructionsOptionID)}
      />

      <EuiSpacer />

      {selectedOptionId === 'apm' ? (
        <ClassicAPMEndpointInstructions apmServerUrl={apmServerUrl} apiKeyDetails={apiKeyDetails} />
      ) : (
        <ManagedOTLPEndpointInstructions
          otlpManagedServiceUrl={otlpManagedServiceUrl}
          apiKeyDetails={apiKeyDetails}
        />
      )}
    </>
  );
}

function ClassicAPMEndpointInstructions({
  apmServerUrl,
  apiKeyDetails,
}: {
  apmServerUrl: string;
  apiKeyDetails?: AgentApiDetails;
}) {
  const authHeaderValue = `Authorization=ApiKey ${apiKeyDetails?.apiKey}`;

  const items = [
    {
      setting: 'OTEL_EXPORTER_OTLP_ENDPOINT',
      value: apmServerUrl ? apmServerUrl : '<apm-managed-service-url>',
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
      name: i18n.translate('xpack.apm.onboarding.config_classic_otel.column.configSettings', {
        defaultMessage: 'Configuration setting',
      }),
    },
    {
      field: 'value',
      width: '55%',
      name: i18n.translate('xpack.apm.onboarding.config_classic_otel.column.configValue', {
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
    {
      field: 'notes',
      name: i18n.translate('xpack.apm.onboarding.config_classic_otel.column.notes', {
        defaultMessage: 'Notes',
      }),
    },
  ];

  return (
    <>
      <EuiMarkdownFormat>
        {i18n.translate('xpack.apm.onboarding.otel.configureSDK.classic.description', {
          defaultMessage:
            'The Classic APM Endpoint translates OpenTelemetry semantic conventions into ECS format prior to storage. Specify the following OpenTelemetry settings as part of the startup of your application.',
        })}
      </EuiMarkdownFormat>
      <EuiSpacer />
      {(apiKeyDetails?.displayApiKeySuccessCallout || apiKeyDetails?.displayApiKeyErrorCallout) && (
        <>
          <ApiKeyCallout
            isError={apiKeyDetails?.displayApiKeyErrorCallout}
            isSuccess={apiKeyDetails?.displayApiKeySuccessCallout}
            errorMessage={apiKeyDetails?.errorMessage}
          />
          <EuiSpacer />
        </>
      )}
      <EuiBasicTable items={items} columns={columns} data-test-subj="otel-instructions-table" />
      <EuiSpacer size="m" />
      <InstructionsFooter />
    </>
  );
}

function ManagedOTLPEndpointInstructions({
  otlpManagedServiceUrl,
  apiKeyDetails,
}: {
  otlpManagedServiceUrl: string;
  apiKeyDetails?: AgentApiDetails;
}) {
  const authHeaderValue = `Authorization=ApiKey ${apiKeyDetails?.apiKey}`;

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
      <EuiMarkdownFormat>
        {i18n.translate('xpack.apm.onboarding.otel.configureAgent.textPre', {
          defaultMessage:
            'The Managed OTLP Endpoint provides native support for handling of log, metric, and trace data from OpenTelemetry sources. It preserves OpenTelemetry semantic conventions and resource attributes, offering a native experience aligned with OpenTelemetry standards. Managed OTLP endpoint is currently in **Technical Preview.** Specify the following OpenTelemetry settings as part of the startup of your application.',
        })}
      </EuiMarkdownFormat>
      <EuiSpacer />
      {(apiKeyDetails?.displayApiKeySuccessCallout || apiKeyDetails?.displayApiKeyErrorCallout) && (
        <>
          <ApiKeyCallout
            isError={apiKeyDetails?.displayApiKeyErrorCallout}
            isSuccess={apiKeyDetails?.displayApiKeySuccessCallout}
            errorMessage={apiKeyDetails?.errorMessage}
          />
          <EuiSpacer />
        </>
      )}
      <EuiBasicTable items={items} columns={columns} data-test-subj="otel-instructions-table" />
      <EuiSpacer size="m" />
      <InstructionsFooter />
    </>
  );
}

function InstructionsFooter() {
  return (
    <EuiText size="xs" color="subdued">
      <FormattedMessage
        id="xpack.apm.onboarding.config_otel.description1"
        defaultMessage="OpenTelemetry agents and SDKs must support the {otelExporterOtlpEndpoint}, {otelExporterOtlpHeaders}, and {otelResourceAttributes} variables; some unstable components may not yet comply with this requirement."
        values={{
          otelExporterOtlpEndpoint: (
            <EuiLink
              data-test-subj="apmOpenTelemetryInstructionsOtelExporterOtlpEndpointLink"
              target="_blank"
              href="https://ela.st/otel-spec-exporter-doc"
              // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
            >
              OTEL_EXPORTER_OTLP_ENDPOINT
            </EuiLink>
          ),
          otelExporterOtlpHeaders: (
            <EuiLink
              data-test-subj="apmOpenTelemetryInstructionsOtelExporterOtlpHeadersLink"
              target="_blank"
              href="https://ela.st/otel-spec-exporter-doc"
              // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
            >
              OTEL_EXPORTER_OTLP_HEADERS
            </EuiLink>
          ),
          otelResourceAttributes: (
            <EuiLink
              data-test-subj="apmOpenTelemetryInstructionsOtelResourceAttributesLink"
              target="_blank"
              href="https://ela.st/otel-spec-sdk"
              // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
            >
              OTEL_RESOURCE_ATTRIBUTES
            </EuiLink>
          ),
        }}
      />
    </EuiText>
  );
}
