/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { captureBodyRt } from '../runtime_types/capture_body_rt';
import { RawSettingDefinition } from './types';

export const generalSettings: RawSettingDefinition[] = [
  // API Request Size
  {
    key: 'api_request_size',
    type: 'bytes',
    defaultValue: '768kb',
    label: i18n.translate('xpack.apm.agentConfig.apiRequestSize.label', {
      defaultMessage: 'API Request Size',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.apiRequestSize.description',
      {
        defaultMessage:
          'The maximum total compressed size of the request body which is sent to the APM Server intake api via a chunked encoding (HTTP streaming).\nNote that a small overshoot is possible.\n\nAllowed byte units are `b`, `kb` and `mb`. `1kb` is equal to `1024b`.',
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'dotnet', 'go', 'nodejs'],
  },

  // API Request Time
  {
    key: 'api_request_time',
    type: 'duration',
    defaultValue: '10s',
    label: i18n.translate('xpack.apm.agentConfig.apiRequestTime.label', {
      defaultMessage: 'API Request Time',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.apiRequestTime.description',
      {
        defaultMessage:
          "Maximum time to keep an HTTP request to the APM Server open for.\n\nNOTE: This value has to be lower than the APM Server's `read_timeout` setting.",
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'dotnet', 'go', 'nodejs'],
  },

  // Capture body
  {
    key: 'capture_body',
    validation: captureBodyRt,
    type: 'select',
    defaultValue: 'off',
    label: i18n.translate('xpack.apm.agentConfig.captureBody.label', {
      defaultMessage: 'Capture body',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.captureBody.description',
      {
        defaultMessage:
          'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables).\nFor transactions that are initiated by receiving a message from a message broker, the agent can capture the textual message body.',
      }
    ),
    options: [
      { text: 'off', value: 'off' },
      { text: 'errors', value: 'errors' },
      { text: 'transactions', value: 'transactions' },
      { text: 'all', value: 'all' },
    ],
    excludeAgents: ['js-base', 'rum-js'],
  },

  // Capture headers
  {
    key: 'capture_headers',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.captureHeaders.label', {
      defaultMessage: 'Capture Headers',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.captureHeaders.description',
      {
        defaultMessage:
          'If set to `true`, the agent will capture HTTP request and response headers (including cookies), as well as message headers/properties when using messaging frameworks (like Kafka).\n\nNOTE: Setting this to `false` reduces network bandwidth, disk space and object allocations.',
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'nodejs'],
  },

  // LOG_LEVEL
  {
    key: 'log_level',
    type: 'text',
    defaultValue: 'info',
    label: i18n.translate('xpack.apm.agentConfig.logLevel.label', {
      defaultMessage: 'Log level',
    }),
    description: i18n.translate('xpack.apm.agentConfig.logLevel.description', {
      defaultMessage: 'Sets the logging level for the agent',
    }),
    includeAgents: ['dotnet', 'ruby'],
  },

  // Recording
  {
    key: 'recording',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.recording.label', {
      defaultMessage: 'Recording',
    }),
    description: i18n.translate('xpack.apm.agentConfig.recording.description', {
      defaultMessage:
        'When recording, the agent instruments incoming HTTP requests, tracks errors, and collects and sends metrics. When set to non-recording, the agent works as a noop, not collecting data and not communicating with the APM Server except for polling for updated configuration. As this is a reversible switch, agent threads are not being killed when set to non-recording, but they will be mostly idle in this state, so the overhead should be negligible. You can use this setting to dynamically control whether Elastic APM is enabled or disabled.',
    }),
    excludeAgents: ['nodejs'],
  },

  // SERVER_TIMEOUT
  {
    key: 'server_timeout',
    type: 'duration',
    defaultValue: '5s',
    label: i18n.translate('xpack.apm.agentConfig.serverTimeout.label', {
      defaultMessage: 'Server Timeout',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.serverTimeout.description',
      {
        defaultMessage:
          'If a request to the APM Server takes longer than the configured timeout,\nthe request is cancelled and the event (exception or transaction) is discarded.\nSet to 0 to disable timeouts.\n\nWARNING: If timeouts are disabled or set to a high value, your app could experience memory issues if the APM Server times out.',
      }
    ),
    includeAgents: ['java'],
  },

  // SPAN_FRAMES_MIN_DURATION
  {
    key: 'span_frames_min_duration',
    type: 'duration',
    min: '-1ms',
    defaultValue: '5ms',
    label: i18n.translate('xpack.apm.agentConfig.spanFramesMinDuration.label', {
      defaultMessage: 'Span frames minimum duration',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.spanFramesMinDuration.description',
      {
        defaultMessage:
          'In its default settings, the APM agent will collect a stack trace with every recorded span.\nWhile this is very helpful to find the exact place in your code that causes the span, collecting this stack trace does have some overhead. \nWhen setting this option to a negative value, like `-1ms`, stack traces will be collected for all spans. Setting it to a positive value, e.g. `5ms`, will limit stack trace collection to spans with durations equal to or longer than the given value, e.g. 5 milliseconds.\n\nTo disable stack trace collection for spans completely, set the value to `0ms`.',
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'nodejs'],
  },

  // STACK_TRACE_LIMIT
  {
    key: 'stack_trace_limit',
    type: 'integer',
    defaultValue: '50',
    label: i18n.translate('xpack.apm.agentConfig.stackTraceLimit.label', {
      defaultMessage: 'Stack trace limit',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.stackTraceLimit.description',
      {
        defaultMessage:
          'Setting it to 0 will disable stack trace collection. Any positive integer value will be used as the maximum number of frames to collect. Setting it -1 means that all frames will be collected.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'go'],
  },

  // Transaction max spans
  {
    key: 'transaction_max_spans',
    type: 'integer',
    min: 0,
    max: 32000,
    defaultValue: '500',
    label: i18n.translate('xpack.apm.agentConfig.transactionMaxSpans.label', {
      defaultMessage: 'Transaction max spans',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionMaxSpans.description',
      {
        defaultMessage:
          'Limits the amount of spans that are recorded per transaction.',
      }
    ),
    excludeAgents: ['js-base', 'rum-js'],
  },

  // Transaction sample rate
  {
    key: 'transaction_sample_rate',
    type: 'float',
    defaultValue: '1.0',
    label: i18n.translate('xpack.apm.agentConfig.transactionSampleRate.label', {
      defaultMessage: 'Transaction sample rate',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionSampleRate.description',
      {
        defaultMessage:
          'By default, the agent will sample every transaction (e.g. request to your service). To reduce overhead and storage requirements, you can set the sample rate to a value between 0.0 and 1.0. We still record overall time and the result for unsampled transactions, but not context information, labels, or spans.',
      }
    ),
  },
];
