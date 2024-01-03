/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { captureBodyRt } from '../runtime_types/capture_body_rt';
import { logLevelRt } from '../runtime_types/log_level_rt';
import { logEcsReformattingRt } from '../runtime_types/log_ecs_reformatting_rt';
import { traceContinuationStrategyRt } from '../runtime_types/trace_continuation_strategy_rt';
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
    excludeAgents: [
      'js-base',
      'rum-js',
      'dotnet',
      'go',
      'nodejs',
      'php',
      'android/java',
      'iOS/swift',
    ],
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
    excludeAgents: [
      'js-base',
      'rum-js',
      'dotnet',
      'go',
      'nodejs',
      'php',
      'android/java',
      'iOS/swift',
    ],
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
    excludeAgents: ['js-base', 'rum-js', 'php', 'android/java', 'iOS/swift'],
  },

  {
    key: 'capture_body_content_types',
    type: 'text',
    defaultValue:
      'application/x-www-form-urlencoded*, text/*, application/json*, application/xml*',
    label: i18n.translate(
      'xpack.apm.agentConfig.captureBodyContentTypes.label',
      {
        defaultMessage: 'Capture Body Content Types',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.captureBodyContentTypes.description',
      {
        defaultMessage:
          'Configures which content types should be recorded.\n' +
          '\n' +
          'The defaults end with a wildcard so that content types like `text/plain; charset=utf-8` are captured as well.',
      }
    ),
    includeAgents: ['java', 'dotnet'],
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
    excludeAgents: [
      'js-base',
      'rum-js',
      'nodejs',
      'php',
      'android/java',
      'iOS/swift',
    ],
  },

  {
    key: 'dedot_custom_metrics',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.dedotCustomMetrics.label', {
      defaultMessage: 'Dedot custom metrics',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.dedotCustomMetrics.description',
      {
        defaultMessage:
          'Replaces dots with underscores in the metric names for custom metrics.\n' +
          '\n' +
          'WARNING: Setting this to `false` can lead to mapping conflicts as dots indicate nesting in Elasticsearch.\n' +
          'An example of when a conflict happens is two metrics with the name `foo` and `foo.bar`.\n' +
          'The first metric maps `foo` to a number and the second metric maps `foo` as an object.',
      }
    ),
    includeAgents: ['java'],
  },

  {
    key: 'disable_instrumentations',
    type: 'text',
    defaultValue: '',
    label: i18n.translate(
      'xpack.apm.agentConfig.disableInstrumentations.label',
      {
        defaultMessage: 'Disable instrumentations',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.disableInstrumentations.description',
      {
        defaultMessage:
          'Comma-separated list of modules to disable instrumentation for.\n' +
          'When instrumentation is disabled for a module, no spans will be collected for that module.\n' +
          '\n' +
          'The up-to-date list of modules for which instrumentation can be disabled is language specific ' +
          'and can be found under the following links: ' +
          '[Java](https://www.elastic.co/guide/en/apm/agent/java/current/config-core.html#config-disable-instrumentations)',
      }
    ),
    includeAgents: ['java'],
  },

  {
    key: 'disable_outgoing_tracecontext_headers',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate(
      'xpack.apm.agentConfig.disableOutgoingTracecontextHeaders.label',
      {
        defaultMessage: 'Disable outgoing tracecontext headers',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.disableOutgoingTracecontextHeaders.description',
      {
        defaultMessage:
          'Use this option to disable `tracecontext` headers injection to any outgoing communication.\n' +
          '\n' +
          'WARNING: Disabling `tracecontext` headers injection means that distributed tracing will not work on downstream services.',
      }
    ),
    includeAgents: ['java'],
  },

  {
    key: 'exit_span_min_duration',
    type: 'duration',
    defaultValue: '0ms',
    min: '0ms',
    label: i18n.translate('xpack.apm.agentConfig.exitSpanMinDuration.label', {
      defaultMessage: 'Exit span min duration',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.exitSpanMinDuration.description',
      {
        defaultMessage:
          'Exit spans are spans that represent a call to an external service, like a database. If such calls are very short, they are usually not relevant and can be ignored.\n' +
          '\n' +
          'NOTE: If a span propagates distributed tracing ids, it will not be ignored, even if it is shorter than the configured threshold. This is to ensure that no broken traces are recorded.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'nodejs', 'python'],
  },

  {
    key: 'ignore_message_queues',
    type: 'text',
    defaultValue: '',
    label: i18n.translate('xpack.apm.agentConfig.ignoreMessageQueues.label', {
      defaultMessage: 'Ignore message queues',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.ignoreMessageQueues.description',
      {
        defaultMessage:
          'Used to filter out specific messaging queues/topics from being traced. \n' +
          '\n' +
          'This property should be set to an array containing one or more strings.\n' +
          'When set, sends-to and receives-from the specified queues/topic will be ignored.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'nodejs'],
  },

  {
    key: 'log_ecs_reformatting',
    validation: logEcsReformattingRt,
    type: 'select',
    defaultValue: 'off',
    label: i18n.translate('xpack.apm.agentConfig.logEcsReformatting.label', {
      defaultMessage: 'Log ECS reformatting',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.logEcsReformatting.description',
      {
        defaultMessage:
          'Specifying whether and how the agent should automatically reformat application logs into ' +
          '[ECS-compatible JSON](https://www.elastic.co/guide/en/ecs-logging/overview/master/intro.html), ' +
          'suitable for ingestion into Elasticsearch for further Log analysis.',
      }
    ),
    options: [
      { text: 'off', value: 'off' },
      { text: 'shade', value: 'shade' },
      { text: 'replace', value: 'replace' },
      { text: 'override', value: 'override' },
    ],
    includeAgents: ['java'],
  },

  // LOG_LEVEL
  {
    key: 'log_level',
    validation: logLevelRt,
    type: 'select',
    defaultValue: 'info',
    label: i18n.translate('xpack.apm.agentConfig.logLevel.label', {
      defaultMessage: 'Log level',
    }),
    description: i18n.translate('xpack.apm.agentConfig.logLevel.description', {
      defaultMessage: 'Sets the logging level for the agent',
    }),
    options: [
      { text: 'trace', value: 'trace' },
      { text: 'debug', value: 'debug' },
      { text: 'info', value: 'info' },
      { text: 'warning', value: 'warning' },
      { text: 'error', value: 'error' },
      { text: 'critical', value: 'critical' },
      { text: 'off', value: 'off' },
    ],
    includeAgents: ['dotnet', 'ruby', 'java', 'python', 'nodejs', 'go', 'php'],
  },

  {
    key: 'mongodb_capture_statement_commands',
    type: 'boolean',
    defaultValue: 'false',
    label: i18n.translate(
      'xpack.apm.agentConfig.mongodbCaptureStatementCommands.label',
      {
        defaultMessage: 'MongoDB capture statement commands',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.mongodbCaptureStatementCommands.description',
      {
        defaultMessage:
          'MongoDB command names for which the command document will be captured, limited to common read-only operations by default. ' +
          'Set to `""` (empty) to disable capture, and `*` to capture all (which is discouraged as it may lead to sensitive information capture).\n' +
          '\n' +
          'This option supports the wildcard `*`, which matches zero or more characters. Examples: `/foo/*/bar/*/baz*`, `*foo*`. ' +
          'Matching is case insensitive by default. Prepending an element with `(?-i)` makes the matching case sensitive.',
      }
    ),
    includeAgents: ['java'],
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
    excludeAgents: ['nodejs', 'rum-js', 'js-base'],
  },

  {
    key: 'context_propagation_only',
    type: 'boolean',
    defaultValue: 'false',
    label: i18n.translate(
      'xpack.apm.agentConfig.context_propagation_only.label',
      {
        defaultMessage: 'Context Propagation Only',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.context_propagation_only.description',
      {
        defaultMessage:
          'When set to true, disables log sending, metrics and trace collection. Trace context propagation and log correlation will stay active.',
      }
    ),
    includeAgents: ['java'],
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

  {
    key: 'span_compression_enabled',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate(
      'xpack.apm.agentConfig.spanCompressionEnabled.label',
      {
        defaultMessage: 'Span compression enabled',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.spanCompressionEnabled.description',
      {
        defaultMessage:
          'Setting this option to true will enable span compression feature.\n' +
          'Span compression reduces the collection, processing, and storage overhead, and removes clutter from the UI. The tradeoff is that some information such as DB statements of all the compressed spans will not be collected.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'python'],
  },

  {
    key: 'span_compression_exact_match_max_duration',
    type: 'duration',
    defaultValue: '50ms',
    min: '0ms',
    label: i18n.translate(
      'xpack.apm.agentConfig.spanCompressionExactMatchMaxDuration.label',
      {
        defaultMessage: 'Span compression exact match max duration',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.spanCompressionExactMatchMaxDuration.description',
      {
        defaultMessage:
          'Consecutive spans that are exact match and that are under this threshold will be compressed into a single composite span. This option does not apply to composite spans. This reduces the collection, processing, and storage overhead, and removes clutter from the UI. The tradeoff is that the DB statements of all the compressed spans will not be collected.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'python'],
  },
  {
    key: 'span_compression_same_kind_max_duration',
    type: 'duration',
    defaultValue: '0ms',
    min: '0ms',
    label: i18n.translate(
      'xpack.apm.agentConfig.spanCompressionSameKindMaxDuration.label',
      {
        defaultMessage: 'Span compression same kind max duration',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.spanCompressionSameKindMaxDuration.description',
      {
        defaultMessage:
          'Consecutive spans to the same destination that are under this threshold will be compressed into a single composite span. This option does not apply to composite spans. This reduces the collection, processing, and storage overhead, and removes clutter from the UI. The tradeoff is that the DB statements of all the compressed spans will not be collected.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'python'],
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
          '(Deprecated, use `span_stack_trace_min_duration` instead!) In its default settings, the APM agent will collect a stack trace with every recorded span.\nWhile this is very helpful to find the exact place in your code that causes the span, collecting this stack trace does have some overhead. \nWhen setting this option to a negative value, like `-1ms`, stack traces will be collected for all spans. Setting it to a positive value, e.g. `5ms`, will limit stack trace collection to spans with durations equal to or longer than the given value, e.g. 5 milliseconds.\n\nTo disable stack trace collection for spans completely, set the value to `0ms`.',
      }
    ),
    excludeAgents: [
      'js-base',
      'rum-js',
      'nodejs',
      'php',
      'android/java',
      'iOS/swift',
    ],
  },

  {
    key: 'span_stack_trace_min_duration',
    type: 'duration',
    min: '-1ms',
    defaultValue: '5ms',
    label: i18n.translate(
      'xpack.apm.agentConfig.spanStackTraceMinDuration.label',
      {
        defaultMessage: 'Span stack trace minimum duration',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.spanStackTraceMinDuration.description',
      {
        defaultMessage:
          'While this is very helpful to find the exact place in your code that causes the span, ' +
          'collecting this stack trace does have some overhead. When setting this option to the value `0ms`, ' +
          'stack traces will be collected for all spans. Setting it to a positive value, e.g. `5ms`, will limit ' +
          'stack trace collection to spans with durations equal to or longer than the given value, e.g. 5 milliseconds.\n' +
          '\n' +
          'To disable stack trace collection for spans completely, set the value to `-1ms`.',
      }
    ),
    includeAgents: ['java', 'dotnet', 'nodejs', 'python'],
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
    includeAgents: ['java', 'dotnet', 'go', 'python'],
  },

  {
    key: 'trace_continuation_strategy',
    validation: traceContinuationStrategyRt,
    type: 'select',
    defaultValue: 'continue',
    label: i18n.translate(
      'xpack.apm.agentConfig.traceContinuationStrategy.label',
      {
        defaultMessage: 'Trace continuation strategy',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.traceContinuationStrategy.description',
      {
        defaultMessage:
          'This option allows some control over how the APM agent handles W3C trace-context headers on incoming requests. By default, the `traceparent` and `tracestate` headers are used per W3C spec for distributed tracing. However, in certain cases it can be helpful to not use the incoming `traceparent` header. Some example use cases:\n' +
          '\n' +
          '* An Elastic-monitored service is receiving requests with `traceparent` headers from unmonitored services.\n' +
          '* An Elastic-monitored service is publicly exposed, and does not want tracing data (trace-ids, sampling decisions) to possibly be spoofed by user requests.\n' +
          '\n' +
          'Valid values are:\n' +
          "* 'continue': The default behavior. An incoming `traceparent` value is used to continue the trace and determine the sampling decision.\n" +
          "* 'restart': Always ignores the `traceparent` header of incoming requests. A new trace-id will be generated and the sampling decision will be made based on transaction_sample_rate. A span link will be made to the incoming `traceparent`.\n" +
          "* 'restart_external': If an incoming request includes the `es` vendor flag in `tracestate`, then any `traceparent` will be considered internal and will be handled as described for 'continue' above. Otherwise, any `traceparent` is considered external and will be handled as described for 'restart' above.\n" +
          '\n' +
          'Starting with Elastic Observability 8.2, span links are visible in trace views.\n' +
          '\n' +
          'This option is case-insensitive.',
      }
    ),
    options: [
      { text: 'continue', value: 'continue' },
      { text: 'restart', value: 'restart' },
      { text: 'restart_external', value: 'restart_external' },
    ],
    includeAgents: ['java', 'nodejs', 'python'],
  },

  // Transaction max spans
  {
    key: 'transaction_max_spans',
    type: 'integer',
    min: 0,
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
    excludeAgents: ['js-base', 'rum-js', 'android/java', 'iOS/swift'],
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
    excludeAgents: ['android/java', 'iOS/swift'],
  },

  // Sanitize field names
  {
    key: 'sanitize_field_names',
    type: 'text',
    defaultValue:
      'password, passwd, pwd, secret, *key, *token*, *session*, *credit*, *card*, authorization, set-cookie',
    label: i18n.translate('xpack.apm.agentConfig.sanitizeFiledNames.label', {
      defaultMessage: 'Sanitize field names',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.sanitizeFiledNames.description',
      {
        defaultMessage:
          'Sometimes it is necessary to sanitize, i.e., remove, sensitive data sent to Elastic APM. This config accepts a list of wildcard patterns of field names which should be sanitized. These apply to HTTP headers (including cookies) and `application/x-www-form-urlencoded` data (POST form fields). The query string and the captured request body (such as `application/json` data) will not get sanitized.',
      }
    ),
    includeAgents: ['java', 'python', 'go', 'dotnet', 'nodejs', 'ruby'],
  },

  // Ignore transactions based on URLs
  {
    key: 'transaction_ignore_urls',
    type: 'text',
    defaultValue:
      'Agent specific - check out the documentation of this config option in the corresponding agent documentation.',
    label: i18n.translate('xpack.apm.agentConfig.transactionIgnoreUrl.label', {
      defaultMessage: 'Ignore transactions based on URLs',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionIgnoreUrl.description',
      {
        defaultMessage:
          'Used to restrict requests to certain URLs from being instrumented. This config accepts a comma-separated list of wildcard patterns of URL paths that should be ignored. When an incoming HTTP request is detected, its request path will be tested against each element in this list. For example, adding `/home/index` to this list would match and remove instrumentation from `http://localhost/home/index` as well as `http://whatever.com/home/index?value1=123`',
      }
    ),
    includeAgents: ['java', 'nodejs', 'python', 'dotnet', 'ruby', 'go'],
  },

  {
    key: 'transaction_ignore_user_agents',
    type: 'text',
    defaultValue: '',
    label: i18n.translate(
      'xpack.apm.agentConfig.transactionIgnoreUserAgents.label',
      {
        defaultMessage: 'Transaction ignore user agents',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionIgnoreUserAgents.description',
      {
        defaultMessage:
          'Used to restrict requests from certain User-Agents from being instrumented.\n' +
          '\n' +
          'When an incoming HTTP request is detected,\n' +
          'the User-Agent from the request headers will be tested against each element in this list.\n' +
          'Example: `curl/*`, `*pingdom*`',
      }
    ),
    includeAgents: ['java'],
  },

  {
    key: 'use_path_as_transaction_name',
    type: 'boolean',
    defaultValue: 'false',
    label: i18n.translate(
      'xpack.apm.agentConfig.usePathAsTransactionName.label',
      {
        defaultMessage: 'Use path as transaction name',
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.usePathAsTransactionName.description',
      {
        defaultMessage:
          'If set to `true`,\n' +
          'transaction names of unsupported or partially-supported frameworks will be in the form of `$method $path` instead of just `$method unknown route`.\n' +
          '\n' +
          'WARNING: If your URLs contain path parameters like `/user/$userId`,\n' +
          'you should be very careful when enabling this flag,\n' +
          'as it can lead to an explosion of transaction groups.\n' +
          'Take a look at the `transaction_name_groups` option on how to mitigate this problem by grouping URLs together.',
      }
    ),
    includeAgents: ['java'],
  },

  {
    key: 'transaction_name_groups',
    type: 'text',
    defaultValue: '',
    label: i18n.translate('xpack.apm.agentConfig.transactionNameGroups.label', {
      defaultMessage: 'Transaction name groups',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionNameGroups.description',
      {
        defaultMessage:
          'With this option,\n' +
          'you can group transaction names that contain dynamic parts with a wildcard expression.\n' +
          'For example,\n' +
          'the pattern `GET /user/*/cart` would consolidate transactions,\n' +
          'such as `GET /users/42/cart` and `GET /users/73/cart` into a single transaction name `GET /users/*/cart`,\n' +
          'hence reducing the transaction name cardinality.',
      }
    ),
    includeAgents: ['java'],
  },
];
