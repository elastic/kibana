/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RawSettingDefinition } from './types';

export const javaSettings: RawSettingDefinition[] = [
  // ENABLE_LOG_CORRELATION
  {
    key: 'enable_log_correlation',
    type: 'boolean',
    defaultValue: 'false',
    label: i18n.translate('xpack.apm.agentConfig.enableLogCorrelation.label', {
      defaultMessage: 'Enable log correlation',
    }),
    description: i18n.translate(
      'xpack.apm.agentConfig.enableLogCorrelation.description',
      {
        defaultMessage:
          "A boolean specifying if the agent should integrate into SLF4J's MDC to enable trace-log correlation. If set to `true`, the agent will set the `trace.id` and `transaction.id` for the currently active spans and transactions to the MDC. Since Java agent version 1.16.0, the agent also adds `error.id` of captured error to the MDC just before the error message is logged. NOTE: While it's allowed to enable this setting at runtime, you can't disable it without a restart.",
      }
    ),
    includeAgents: ['java'],
  },

  /*
   * Circuit-Breaker
   **/
  {
    key: 'circuit_breaker_enabled',
    label: i18n.translate('xpack.apm.agentConfig.circuitBreakerEnabled.label', {
      defaultMessage: 'Cirtcuit breaker enabled',
    }),
    type: 'boolean',
    category: 'Circuit-Breaker',
    defaultValue: 'false',
    description: i18n.translate(
      'xpack.apm.agentConfig.circuitBreakerEnabled.description',
      {
        defaultMessage:
          'A boolean specifying whether the circuit breaker should be enabled or not.  When enabled, the agent periodically polls stress monitors to detect system/process/JVM stress state. If ANY of the monitors detects a stress indication, the agent will pause, as if the `recording` configuration option has been set to `false`, thus reducing resource consumption to a minimum. When paused, the agent continues polling the same monitors in order to detect whether the stress state has been relieved. If ALL monitors approve that the system/process/JVM is not under stress anymore, the agent will resume and become fully functional.',
      }
    ),
    includeAgents: ['java'],
  },
  {
    key: 'stress_monitor_gc_stress_threshold',
    label: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorGcStressThreshold.label',
      { defaultMessage: 'Stress monitor gc stress threshold' }
    ),
    type: 'float',
    category: 'Circuit-Breaker',
    defaultValue: '0.95',
    description: i18n.translate(
      'xpack.apm.agentConfig.stressMonitorGcStressThreshold.description',
      {
        defaultMessage:
          'The threshold used by the GC monitor to rely on for identifying heap stress. The same threshold will be used for all heap pools, so that if ANY has a usage percentage that crosses it, the agent will consider it as a heap stress. The GC monitor relies only on memory consumption measured after a recent GC.',
      }
    ),
    includeAgents: ['java'],
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
      'xpack.apm.agentConfig.stressMonitorGcReliefThreshold.description',
      {
        defaultMessage:
          'The threshold used by the GC monitor to rely on for identifying when the heap is not under stress. If `stress_monitor_gc_stress_threshold` has been crossed, the agent will consider it a heap-stress state. In order to determine that the stress state is over, percentage of occupied memory in ALL heap pools should be lower than this threshold. The GC monitor relies only on memory consumption measured after a recent GC.',
      }
    ),
    includeAgents: ['java'],
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
      'xpack.apm.agentConfig.stressMonitorCpuDurationThreshold.description',
      {
        defaultMessage:
          'The minimal time required in order to determine whether the system is either currently under stress, or that the stress detected previously has been relieved. All measurements during this time must be consistent in comparison to the relevant threshold in order to detect a change of stress state. Must be at least `1m`.',
      }
    ),
    includeAgents: ['java'],
    min: '1m',
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
      'xpack.apm.agentConfig.stressMonitorSystemCpuStressThreshold.description',
      {
        defaultMessage:
          'The threshold used by the system CPU monitor to detect system CPU stress. If the system CPU crosses this threshold for a duration of at least `stress_monitor_cpu_duration_threshold`, the monitor considers this as a stress state.',
      }
    ),
    includeAgents: ['java'],
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
      'xpack.apm.agentConfig.stressMonitorSystemCpuReliefThreshold.description',
      {
        defaultMessage:
          'The threshold used by the system CPU monitor to determine that the system is not under CPU stress. If the monitor detected a CPU stress, the measured system CPU needs to be below this threshold for a duration of at least `stress_monitor_cpu_duration_threshold` in order for the monitor to decide that the CPU stress has been relieved.',
      }
    ),
    includeAgents: ['java'],
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
          'Set to `true` to make the agent create spans for method executions based on async-profiler, a sampling aka statistical profiler. Due to the nature of how sampling profilers work, the duration of the inferred spans are not exact, but only estimations. The `profiling_inferred_spans_sampling_interval` lets you fine tune the trade-off between accuracy and overhead. The inferred spans are created after a profiling session has ended. This means there is a delay between the regular and the inferred spans being visible in the UI. NOTE: This feature is not available on Windows.',
      }
    ),
    includeAgents: ['java'],
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
          'The frequency at which stack traces are gathered within a profiling session. The lower you set it, the more accurate the durations will be. This comes at the expense of higher overhead and more spans for potentially irrelevant operations. The minimal duration of a profiling-inferred span is the same as the value of this setting.',
      }
    ),
    includeAgents: ['java'],
    min: '1ms',
    max: '1s',
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
          'The minimum duration of an inferred span. Note that the min duration is also implicitly set by the sampling interval. However, increasing the sampling interval also decreases the accuracy of the duration of inferred spans.',
      }
    ),
    includeAgents: ['java'],
    min: '0ms',
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
          'If set, the agent will only create inferred spans for methods which match this list. Setting a value may slightly reduce overhead and can reduce clutter by only creating spans for the classes you are interested in. This option supports the wildcard `*`, which matches zero or more characters. Example: `org.example.myapp.*`. Matching is case insensitive by default. Prepending an element with `(?-i)` makes the matching case sensitive.',
      }
    ),
    includeAgents: ['java'],
  },
  {
    key: 'profiling_inferred_spans_excluded_classes',
    label: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansExcludedClasses.label',
      { defaultMessage: 'Profiling inferred spans excluded classes' }
    ),
    type: 'text',
    category: 'Profiling',
    defaultValue:
      '(?-i)java.*,(?-i)javax.*,(?-i)sun.*,(?-i)com.sun.*,(?-i)jdk.*,(?-i)org.apache.tomcat.*,(?-i)org.apache.catalina.*,(?-i)org.apache.coyote.*,(?-i)org.jboss.as.*,(?-i)org.glassfish.*,(?-i)org.eclipse.jetty.*,(?-i)com.ibm.websphere.*,(?-i)io.undertow.*',
    description: i18n.translate(
      'xpack.apm.agentConfig.profilingInferredSpansExcludedClasses.description',
      {
        defaultMessage:
          'Excludes classes for which no profiler-inferred spans should be created. This option supports the wildcard `*`, which matches zero or more characters. Matching is case insensitive by default. Prepending an element with `(?-i)` makes the matching case sensitive.',
      }
    ),
    includeAgents: ['java'],
  },
];
