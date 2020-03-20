/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { getIntegerRt } from '../integer_rt';
import { captureBodyRt } from '../capture_body_rt';

interface BaseSetting {
  /**
   * UI: unique key to identify setting
   */
  key: string;

  /**
   * UI: Human readable name of setting
   */
  label: string;

  /**
   * UI: Human readable name of setting
   * Not used yet
   */
  category?: string;

  /**
   * UI:
   */
  defaultValue?: string;

  /**
   * UI: description of setting
   */
  description: string;

  /**
   * UI: placeholder to show in input field
   */
  placeholder?: string;

  /**
   * runtime validation of the input
   */
  validation?: t.Type<any, string, unknown>;

  /**
   * UI: error shown when the runtime validation fails
   */
  validationError?: string;

  /**
   * Limits the setting to no agents, except those specified in `includeAgents`
   */
  includeAgents?: AgentName[];

  /**
   * Limits the setting to all agents, except those specified in `excludeAgents`
   */
  excludeAgents?: AgentName[];
}

interface TextSetting extends BaseSetting {
  type: 'text';
}

interface IntegerSetting extends BaseSetting {
  type: 'integer';
  min?: number;
  max?: number;
}

interface FloatSetting extends BaseSetting {
  type: 'float';
}

interface SelectSetting extends BaseSetting {
  type: 'select';
  options: Array<{ text: string }>;
}

interface BooleanSetting extends BaseSetting {
  type: 'boolean';
}

interface BytesSetting extends BaseSetting {
  type: 'bytes';
  units?: string[];
}

interface DurationSetting extends BaseSetting {
  type: 'duration';
  units?: string[];
}

export type RawConfigSettingDefinition =
  | TextSetting
  | FloatSetting
  | IntegerSetting
  | SelectSetting
  | BooleanSetting
  | BytesSetting
  | DurationSetting;

/*
 * Settings added here will show up in the UI and will be validated on the client and server
 */
export const rawConfigSettingDefinitions: RawConfigSettingDefinition[] = [
  // Active
  {
    key: 'active',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.active.label', {
      defaultMessage: 'Active'
    }),
    description: i18n.translate('xpack.apm.agentConfig.active.description', {
      defaultMessage:
        'A boolean specifying if the agent should be active or not.\nWhen active, the agent instruments incoming HTTP requests, tracks errors and collects and sends metrics.\nWhen inactive, the agent works as a noop, not collecting data and not communicating with the APM Server.\nAs this is a reversible switch, agent threads are not being killed when inactivated, but they will be \nmostly idle in this state, so the overhead should be negligible.\n\nYou can use this setting to dynamically disable Elastic APM at runtime.'
    }),
    excludeAgents: ['js-base', 'rum-js', 'python', 'dotnet']
  },

  // API Request Size
  {
    key: 'api_request_size',
    type: 'bytes',
    defaultValue: '768kb',
    label: i18n.translate('xpack.apm.agentConfig.apiRequestSize.label', {
      defaultMessage: 'API Request Size'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.apiRequestSize.description',
      {
        defaultMessage:
          'The maximum total compressed size of the request body which is sent to the APM server intake api via a chunked encoding (HTTP streaming).\nNote that a small overshoot is possible.\n\nAllowed byte units are `b`, `kb` and `mb`. `1kb` is equal to `1024b`.'
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'dotnet']
  },

  // API Request Time
  {
    key: 'api_request_time',
    type: 'duration',
    defaultValue: '10s',
    label: i18n.translate('xpack.apm.agentConfig.apiRequestTime.label', {
      defaultMessage: 'API Request Time'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.apiRequestTime.description',
      {
        defaultMessage:
          "Maximum time to keep an HTTP request to the APM Server open for.\n\nNOTE: This value has to be lower than the APM Server's `read_timeout` setting."
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'dotnet']
  },

  // Capture headers
  {
    key: 'capture_headers',
    type: 'boolean',
    defaultValue: 'true',
    label: i18n.translate('xpack.apm.agentConfig.captureHeaders.label', {
      defaultMessage: 'Capture Headers'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.captureHeaders.description',
      {
        defaultMessage:
          'If set to `true`, the agent will capture request and response headers, including cookies.\n\nNOTE: Setting this to `false` reduces network bandwidth, disk space and object allocations.'
      }
    ),
    excludeAgents: ['js-base', 'rum-js']
  },

  // Capture body
  {
    key: 'capture_body',
    validation: captureBodyRt,
    type: 'select',
    defaultValue: 'off',
    label: i18n.translate('xpack.apm.agentConfig.captureBody.label', {
      defaultMessage: 'Capture body'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.captureBody.description',
      {
        defaultMessage:
          'For transactions that are HTTP requests, the agent can optionally capture the request body (e.g. POST variables). Default is "off".'
      }
    ),
    options: [
      { text: 'off' },
      { text: 'errors' },
      { text: 'transactions' },
      { text: 'all' }
    ],
    excludeAgents: ['js-base', 'rum-js', 'dotnet']
  },

  // ENABLE_LOG_CORRELATION
  {
    key: 'enable_log_correlation',
    type: 'boolean',
    defaultValue: 'false',
    label: i18n.translate('xpack.apm.agentConfig.enableLogCorrelation.label', {
      defaultMessage: 'Enable log correlation'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.enableLogCorrelation.description',
      {
        defaultMessage:
          "A boolean specifying if the agent should integrate into SLF4J's https://www.slf4j.org/api/org/slf4j/MDC.html[MDC] to enable trace-log correlation.\nIf set to `true`, the agent will set the `trace.id` and `transaction.id` for the currently active spans and transactions to the MDC.\nSee <<log-correlation>> for more details.\n\nNOTE: While it's allowed to enable this setting at runtime, you can't disable it without a restart."
      }
    ),
    includeAgents: ['java']
  },

  // LOG_LEVEL
  {
    key: 'log_level',
    type: 'text',
    defaultValue: 'info',
    label: i18n.translate('xpack.apm.agentConfig.logLevel.label', {
      defaultMessage: 'Log level'
    }),
    description: i18n.translate('xpack.apm.agentConfig.logLevel.description', {
      defaultMessage: 'Sets the logging level for the agent'
    }),
    excludeAgents: ['js-base', 'rum-js', 'python']
  },

  // SERVER_TIMEOUT
  {
    key: 'server_timeout',
    type: 'duration',
    defaultValue: '5s',
    label: i18n.translate('xpack.apm.agentConfig.serverTimeout.label', {
      defaultMessage: 'Server Timeout'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.serverTimeout.description',
      {
        defaultMessage:
          'If a request to the APM server takes longer than the configured timeout,\nthe request is cancelled and the event (exception or transaction) is discarded.\nSet to 0 to disable timeouts.\n\nWARNING: If timeouts are disabled or set to a high value, your app could experience memory issues if the APM server times out.'
      }
    ),
    includeAgents: ['nodejs', 'java', 'go']
  },

  // SPAN_FRAMES_MIN_DURATION
  {
    key: 'span_frames_min_duration',
    type: 'duration',
    defaultValue: '5ms',
    label: i18n.translate('xpack.apm.agentConfig.spanFramesMinDuration.label', {
      defaultMessage: 'Span frames minimum duration'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.spanFramesMinDuration.description',
      {
        defaultMessage:
          'In its default settings, the APM agent will collect a stack trace with every recorded span.\nWhile this is very helpful to find the exact place in your code that causes the span, collecting this stack trace does have some overhead. \nWhen setting this option to a negative value, like `-1ms`, stack traces will be collected for all spans. Setting it to a positive value, e.g. `5ms`, will limit stack trace collection to spans with durations equal to or longer than the given value, e.g. 5 milliseconds.\n\nTo disable stack trace collection for spans completely, set the value to `0ms`.'
      }
    ),
    excludeAgents: ['js-base', 'rum-js', 'nodejs']
  },

  // STACK_TRACE_LIMIT
  {
    key: 'stack_trace_limit',
    type: 'integer',
    defaultValue: '50',
    label: i18n.translate('xpack.apm.agentConfig.stackTraceLimit.label', {
      defaultMessage: 'Stack trace limit'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.stackTraceLimit.description',
      {
        defaultMessage:
          'Setting it to 0 will disable stack trace collection. Any positive integer value will be used as the maximum number of frames to collect. Setting it -1 means that all frames will be collected.'
      }
    ),
    includeAgents: ['nodejs', 'java', 'dotnet', 'go']
  },

  // TRACE_METHODS_DURATION_THRESHOLD
  {
    key: 'trace_methods_duration_threshold',
    type: 'integer',
    label: i18n.translate(
      'xpack.apm.agentConfig.traceMethodsDurationThreshold.label',
      {
        defaultMessage: 'Trace methods duration threshold'
      }
    ),
    description: i18n.translate(
      'xpack.apm.agentConfig.traceMethodsDurationThreshold.description',
      {
        defaultMessage:
          'If trace_methods config option is set, provides a threshold to limit spans based on duration. When set to a value greater than 0, spans representing methods traced based on trace_methods will be discarded by default.'
      }
    ),
    includeAgents: ['java']
  },

  // Transaction sample rate
  {
    key: 'transaction_sample_rate',
    type: 'float',
    defaultValue: '1.0',
    label: i18n.translate('xpack.apm.agentConfig.transactionSampleRate.label', {
      defaultMessage: 'Transaction sample rate'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionSampleRate.description',
      {
        defaultMessage:
          'By default, the agent will sample every transaction (e.g. request to your service). To reduce overhead and storage requirements, you can set the sample rate to a value between 0.0 and 1.0. We still record overall time and the result for unsampled transactions, but no context information, labels, or spans.'
      }
    )
  },

  // Transaction max spans
  {
    key: 'transaction_max_spans',
    type: 'integer',
    validation: getIntegerRt({ min: 0, max: 32000 }),
    validationError: i18n.translate(
      'xpack.apm.agentConfig.transactionMaxSpans.errorText',
      { defaultMessage: 'Must be between 0 and 32000' }
    ),
    defaultValue: '500',
    label: i18n.translate('xpack.apm.agentConfig.transactionMaxSpans.label', {
      defaultMessage: 'Transaction max spans'
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.transactionMaxSpans.description',
      {
        defaultMessage:
          'Limits the amount of spans that are recorded per transaction. Default is 500.'
      }
    ),
    min: 0,
    max: 32000,
    excludeAgents: ['js-base', 'rum-js']
  },

  /*
   * Circuit-Breaker
   **/
  {
    key: 'circuit_breaker_enabled',
    label: i18n.translate('xpack.apm.agentConfig.circuitBreakerEnabled.label', {
      defaultMessage: 'Cirtcuit breaker enabled'
    }),
    type: 'boolean',
    category: 'Circuit-Breaker',
    defaultValue: 'false',
    description: i18n.translate(
      'xpack.apm.agentConfig.circuitBreakerEnabled.description',
      {
        defaultMessage:
          'A boolean specifying whether the circuit breaker should be enabled or not. \nWhen enabled, the agent periodically polls stress monitors to detect system/process/JVM stress state. \nIf ANY of the monitors detects a stress indication, the agent will become inactive, as if the \n<<config-active>> configuration option has been set to `false`, thus reducing resource consumption to a minimum. \nWhen inactive, the agent continues polling the same monitors in order to detect whether the stress state \nhas been relieved. If ALL monitors approve that the system/process/JVM is not under stress anymore, the \nagent will resume and become fully functional.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'stress_monitor_gc_stress_threshold',
    label: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorGcStressThreshold.label',
      { defaultMessage: 'Stress monitor gc stress threshold' }
    ),
    type: 'boolean',
    category: 'Circuit-Breaker',
    defaultValue: '0.95',
    description: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorGcStressThreshold.description',
      {
        defaultMessage:
          'The threshold used by the GC monitor to rely on for identifying heap stress.\nThe same threshold will be used for all heap pools, so that if ANY has a usage percentage that crosses it, \nthe agent will consider it as a heap stress. The GC monitor relies only on memory consumption measured \nafter a recent GC.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'stress_monitor_gc_relief_threshold',
    label: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorGcReliefThreshold.label',
      { defaultMessage: 'Stress monitor gc relief threshold' }
    ),

    type: 'float',
    category: 'Circuit-Breaker',
    defaultValue: '0.75',
    description: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorGcReliefThreshold.label',
      {
        defaultMessage:
          'The threshold used by the GC monitor to rely on for identifying when the heap is not under stress .\nIf `stress_monitor_gc_stress_threshold` has been crossed, the agent will consider it a heap-stress state. \nIn order to determine that the stress state is over, percentage of occupied memory in ALL heap pools should \nbe lower than this threshold. The GC monitor relies only on memory consumption measured after a recent GC.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'stress_monitor_cpu_duration_threshold',
    label: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorCpuDurationThreshold.label',
      { defaultMessage: 'Stress monitor cpu duration threshold' }
    ),
    type: 'duration',
    category: 'Circuit-Breaker',
    defaultValue: '1m',
    description: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorCpuDurationThreshold.label',
      {
        defaultMessage:
          'The minimal time required in order to determine whether the system is \neither currently under stress, or that the stress detected previously has been relieved. \nAll measurements during this time must be consistent in comparison to the relevant threshold in \norder to detect a change of stress state. Must be at least `1m`.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'stress_monitor_system_cpu_stress_threshold',
    label: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorSystemCpuStressThreshold.label',
      { defaultMessage: 'Stress monitor system cpu stress threshold' }
    ),
    type: 'float',
    category: 'Circuit-Breaker',
    defaultValue: '0.95',
    description: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorSystemCpuStressThreshold.label',
      {
        defaultMessage:
          'The threshold used by the system CPU monitor to detect system CPU stress. \nIf the system CPU crosses this threshold for a duration of at least `stress_monitor_cpu_duration_threshold`, \nthe monitor considers this as a stress state.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'stress_monitor_system_cpu_relief_threshold',
    label: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorSystemCpuReliefThreshold.label',
      { defaultMessage: 'Stress monitor system cpu relief threshold' }
    ),
    type: 'float',
    category: 'Circuit-Breaker',
    defaultValue: '0.8',
    description: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorSystemCpuReliefThreshold.label',
      {
        defaultMessage:
          'The threshold used by the system CPU monitor to determine that the system is \nnot under CPU stress. If the monitor detected a CPU stress, the measured system CPU needs to be below \nthis threshold for a duration of at least `stress_monitor_cpu_duration_threshold` in order for the \nmonitor to decide that the CPU stress has been relieved.'
      }
    ),
    includeAgents: ['java']
  },

  /*
   * Profiling
   **/

  {
    key: 'profiling_inferred_spans_enabled',
    label: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansEnabled.label',
      { defaultMessage: 'Profiling inferred spans enabled' }
    ),
    type: 'boolean',
    category: 'Profiling',
    defaultValue: 'false',
    description: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansEnabled.description',
      {
        defaultMessage:
          'Set to `true` to make the agent create spans for method executions based on\nhttps://github.com/jvm-profiling-tools/async-profiler[async-profiler], a sampling aka statistical profiler.\n\nDue to the nature of how sampling profilers work,\nthe duration of the inferred spans are not exact, but only estimations.\nThe <<config-profiling-inferred-spans-sampling-interval, `profiling_inferred_spans_sampling_interval`>> lets you fine tune the trade-off between accuracy and overhead.\n\nThe inferred spans are created after a profiling session has ended.\nThis means there is a delay between the regular and the inferred spans being visible in the UI.\n\nNOTE: This feature is not available on Windows'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'profiling_inferred_spans_sampling_interval',
    label: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansSamplingInterval.label',
      { defaultMessage: 'Profiling inferred spans sampling interval' }
    ),
    type: 'duration',
    category: 'Profiling',
    defaultValue: '50ms',
    description: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansSamplingInterval.description',
      {
        defaultMessage:
          'The frequency at which stack traces are gathered within a profiling session.\nThe lower you set it, the more accurate the durations will be.\nThis comes at the expense of higher overhead and more spans for potentially irrelevant operations.\nThe minimal duration of a profiling-inferred span is the same as the value of this setting.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'profiling_inferred_spans_min_duration',
    label: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansMinDuration.label',
      { defaultMessage: 'Profiling inferred spans min duration' }
    ),
    type: 'duration',
    category: 'Profiling',
    defaultValue: '0ms',
    description: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansMinDuration.description',
      {
        defaultMessage:
          'The minimum duration of an inferred span.\nNote that the min duration is also implicitly set by the sampling interval.\nHowever, increasing the sampling interval also decreases the accuracy of the duration of inferred spans.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'profiling_inferred_spans_included_classes',
    label: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansIncludedClasses.label',
      { defaultMessage: 'Profiling inferred spans included classes' }
    ),
    type: 'text',
    category: 'Profiling',
    defaultValue: '*',
    description: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansIncludedClasses.description',
      {
        defaultMessage:
          'If set, the agent will only create inferred spans for methods which match this list.\nSetting a value may slightly increase performance and can reduce clutter by only creating spans for the classes you are interested in.\nExample: `org.example.myapp.*`\n\nThis option supports the wildcard `*`, which matches zero or more characters.\nExamples: `/foo/*/bar/*/baz*`, `*foo*`.\nMatching is case insensitive by default.\nPrepending an element with `(?-i)` makes the matching case sensitive.'
      }
    ),
    includeAgents: ['java']
  },
  {
    key: 'profiling_inferred_spans_excluded_classes',
    label: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansExcludedClasses.label',
      { defaultMessage: 'Profiling inferred spans excluded classes' }
    ),
    type: 'text',
    category: 'Profiling',
    description: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansExcludedClasses.description',
      {
        defaultMessage:
          'Excludes classes for which no profiler-inferred spans should be created.\n\nThis option supports the wildcard `*`, which matches zero or more characters.\nExamples: `/foo/*/bar/*/baz*`, `*foo*`.\nMatching is case insensitive by default.\nPrepending an element with `(?-i)` makes the matching case sensitive.'
      }
    ),
    includeAgents: ['java']
  }
];
