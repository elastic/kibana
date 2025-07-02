/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RawSettingDefinition } from './types';
import { loggingLevelRt } from '../runtime_types/logging_level_rt';

export const edotSDKSettings: RawSettingDefinition[] = [
  {
    key: 'deactivate_instrumentations',
    type: 'text',
    defaultValue: '',
    label: i18n.translate('xpack.apm.agentConfig.deactivate_instrumentations.label', {
      defaultMessage: 'Deactivate instrumentations',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.edot.deactivate_instrumentations.description',
      {
        defaultMessage:
          'Comma-separated list of instrumentation names to disable. When an instrumentation is disabled, no telemetry will be collected for the library/module it instruments. ' +
          'The list of supported instrumentation names is language specific:\n' +
          '- [EDOT Java](https://ela.st/otel-agent-instructions): for example "akka-http,grpc"\n' +
          '- [EDOT Node.js](https://ela.st/edot-node-disable-instrs): for example "net,dns,http"',
      }
    ),
    includeAgents: ['opentelemetry/java/elastic', 'opentelemetry/nodejs/elastic'],
  },
  {
    key: 'deactivate_all_instrumentations',
    type: 'boolean',
    defaultValue: 'false',
    label: i18n.translate('xpack.apm.agentConfig.deactivate_all_instrumentations.label', {
      defaultMessage: 'Deactivate all instrumentations',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.edot.deactivate_all_instrumentations.description',
      {
        defaultMessage: 'No spans will be collected for any instrumentation modules.',
      }
    ),
    includeAgents: ['opentelemetry/java/elastic', 'opentelemetry/nodejs/elastic'],
  },
  {
    key: 'logging_level',
    validation: loggingLevelRt,
    type: 'select',
    defaultValue: 'info',
    label: i18n.translate('xpack.apm.agentConfig.loggingLevel.label', {
      defaultMessage: 'Logging level',
    }),
    description: i18n.translate('xpack.apm.agentConfig.loggingLevel.description', {
      defaultMessage: 'Sets the logging level for the agent.',
    }),
    options: [
      { text: 'trace', value: 'trace' },
      { text: 'debug', value: 'debug' },
      { text: 'info', value: 'info' },
      { text: 'warn', value: 'warn' },
      { text: 'error', value: 'error' },
      { text: 'fatal', value: 'fatal' },
      { text: 'off', value: 'off' },
    ],
    includeAgents: [
      'opentelemetry/java/elastic',
      'opentelemetry/nodejs/elastic',
      'opentelemetry/python/elastic',
      'opentelemetry/php/elastic',
      'opentelemetry/dotnet/elastic',
    ],
  },
  {
    key: 'send_traces',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.send_traces.label', {
      defaultMessage: 'Send traces',
    }),
    description: i18n.translate('xpack.apm.agentConfig.edot.send_traces.description', {
      defaultMessage:
        'Set the traces exporter to send or discard traces. When set to false, all traces will be discarded so there will be no traces sent to the collector\n' +
        '\n',
    }),
    includeAgents: ['opentelemetry/java/elastic'],
  },
  {
    key: 'send_metrics',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.send_metrics.label', {
      defaultMessage: 'Send metrics',
    }),
    description: i18n.translate('xpack.apm.agentConfig.edot.send_metrics.description', {
      defaultMessage:
        'Set the metrics exporter to send or discard metrics. When set to false, all metrics will be discarded so there will be no metrics sent to the collector\n' +
        '\n',
    }),
    includeAgents: ['opentelemetry/java/elastic'],
  },
  {
    key: 'send_logs',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.send_logs.label', {
      defaultMessage: 'Send logs',
    }),
    description: i18n.translate('xpack.apm.agentConfig.edot.send_logs.description', {
      defaultMessage:
        'Set the logs exporter to send or discard logs. When set to false, all logs (that are normally sent by the agent) will be discarded so there will be no logs sent to the collector\n' +
        '\n',
    }),
    includeAgents: ['opentelemetry/java/elastic'],
  },
];
