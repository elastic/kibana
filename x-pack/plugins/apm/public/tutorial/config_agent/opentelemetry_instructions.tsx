/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ValuesType } from 'utility-types';

interface Props {
  apmServerUrl?: string;
  secretToken?: string;
}

export function OpenTelemetryInstructions({
  apmServerUrl,
  secretToken,
}: Props) {
  const items = [
    {
      setting: 'OTEL_EXPORTER_OTLP_ENDPOINT',
      value: apmServerUrl ? apmServerUrl : '<apm-server-url>',
    },
    {
      setting: 'OTEL_EXPORTER_OTLP_HEADERS',
      value: `"Authorization=Bearer ${
        secretToken ? secretToken : '<secret-token>'
      }"`,
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
      name: i18n.translate(
        'xpack.apm.tutorial.config_otel.column.configSettings',
        {
          defaultMessage: 'Configuration setting (1)',
        }
      ),
    },
    {
      field: 'value',
      name: i18n.translate(
        'xpack.apm.tutorial.config_otel.column.configValue',
        {
          defaultMessage: 'Configuration value',
        }
      ),
      render: (_, { value }) => (
        <EuiText size="s" color="accent">
          {value}
        </EuiText>
      ),
    },
    {
      field: 'notes',
      name: i18n.translate('xpack.apm.tutorial.config_otel.column.notes', {
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
          id="xpack.apm.tutorial.config_otel.description1"
          defaultMessage="(1) OpenTelemetry agents and SDKs must support the {otelExporterOtlpEndpoint}, {otelExporterOtlpHeaders}, and {otelResourceAttributes} variables; some unstable components may not yet comply with this requirement."
          values={{
            otelExporterOtlpEndpoint: (
              <EuiLink
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/protocol/exporter.md"
              >
                OTEL_EXPORTER_OTLP_ENDPOINT
              </EuiLink>
            ),
            otelExporterOtlpHeaders: (
              <EuiLink
                target="_blank"
                href="https://github.com/open-telemetry/opentelemetry-specification/blob/v1.10.0/specification/protocol/exporter.md"
              >
                OTEL_EXPORTER_OTLP_HEADERS
              </EuiLink>
            ),
            otelResourceAttributes: (
              <EuiLink
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
          id="xpack.apm.tutorial.config_otel.description2"
          defaultMessage="The 'OTEL_METRICS_EXPORTER` and 'OTEL_LOGS_EXPORTER' environment variables may not be supported by some SDKs."
        />
        <EuiSpacer size="xs" />
        <FormattedMessage
          id="xpack.apm.tutorial.config_otel.description3"
          defaultMessage="The exhaustive list of environment variables, command line parameters, and configuration code snippets (according to the OpenTelemetry specification) is available in the {otelInstrumentationGuide}. Some unstable OpenTelemetry clients may not support all features and may require alternate configuration mechanisms."
          values={{
            otelInstrumentationGuide: (
              <EuiLink
                target="_blank"
                href="https://opentelemetry.io/docs/instrumentation"
              >
                {i18n.translate(
                  'xpack.apm.tutorial.config_otel.instrumentationGuide',
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
