/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { filterByAgent, settingDefinitions } from '.';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { SettingDefinition } from './types';

describe('filterByAgent', () => {
  describe('when `excludeAgents` is dotnet and nodejs', () => {
    const setting = {
      key: 'my-setting',
      excludeAgents: ['dotnet', 'nodejs']
    } as SettingDefinition;

    it('should not include dotnet', () => {
      expect(filterByAgent('dotnet')(setting)).toBe(false);
    });

    it('should include go', () => {
      expect(filterByAgent('go')(setting)).toBe(true);
    });
  });

  describe('when `includeAgents` is dotnet and nodejs', () => {
    const setting = {
      key: 'my-setting',
      includeAgents: ['dotnet', 'nodejs']
    } as SettingDefinition;

    it('should not include go', () => {
      expect(filterByAgent('go')(setting)).toBe(false);
    });

    it('should include dotnet', () => {
      expect(filterByAgent('dotnet')(setting)).toBe(true);
    });
  });

  describe('options per agent', () => {
    it('go', () => {
      expect(getSettingKeysForAgent('go')).toEqual([
        'active',
        'api_request_size',
        'api_request_time',
        'capture_headers',
        'capture_body',
        'log_level',
        'server_timeout',
        'span_frames_min_duration',
        'stack_trace_limit',
        'transaction_sample_rate',
        'transaction_max_spans'
      ]);
    });

    it('java', () => {
      expect(getSettingKeysForAgent('java')).toEqual([
        'active',
        'api_request_size',
        'api_request_time',
        'capture_headers',
        'capture_body',
        'enable_log_correlation',
        'log_level',
        'server_timeout',
        'span_frames_min_duration',
        'stack_trace_limit',
        'trace_methods_duration_threshold',
        'transaction_sample_rate',
        'transaction_max_spans',
        'circuit_breaker_enabled',
        'stress_monitor_gc_stress_threshold',
        'stress_monitor_gc_relief_threshold',
        'stress_monitor_cpu_duration_threshold',
        'stress_monitor_system_cpu_stress_threshold',
        'stress_monitor_system_cpu_relief_threshold',
        'profiling_inferred_spans_enabled',
        'profiling_inferred_spans_sampling_interval',
        'profiling_inferred_spans_min_duration',
        'profiling_inferred_spans_included_classes',
        'profiling_inferred_spans_excluded_classes'
      ]);
    });

    it('js-base', () => {
      expect(getSettingKeysForAgent('js-base')).toEqual([
        'transaction_sample_rate'
      ]);
    });

    it('rum-js', () => {
      expect(getSettingKeysForAgent('rum-js')).toEqual([
        'transaction_sample_rate'
      ]);
    });

    it('nodejs', () => {
      expect(getSettingKeysForAgent('nodejs')).toEqual([
        'active',
        'api_request_size',
        'api_request_time',
        'capture_headers',
        'capture_body',
        'log_level',
        'server_timeout',
        'stack_trace_limit',
        'transaction_sample_rate',
        'transaction_max_spans'
      ]);
    });

    it('python', () => {
      expect(getSettingKeysForAgent('python')).toEqual([
        'api_request_size',
        'api_request_time',
        'capture_headers',
        'capture_body',
        'span_frames_min_duration',
        'transaction_sample_rate',
        'transaction_max_spans'
      ]);
    });

    it('dotnet', () => {
      expect(getSettingKeysForAgent('dotnet')).toEqual([
        'capture_headers',
        'log_level',
        'span_frames_min_duration',
        'stack_trace_limit',
        'transaction_sample_rate',
        'transaction_max_spans'
      ]);
    });

    it('ruby', () => {
      expect(getSettingKeysForAgent('ruby')).toEqual([
        'active',
        'api_request_size',
        'api_request_time',
        'capture_headers',
        'capture_body',
        'log_level',
        'span_frames_min_duration',
        'transaction_sample_rate',
        'transaction_max_spans'
      ]);
    });

    it('"All" services (no agent name)', () => {
      expect(getSettingKeysForAgent(undefined)).toEqual([
        'capture_headers',
        'transaction_sample_rate',
        'transaction_max_spans'
      ]);
    });
  });
});

describe('settingDefinitions', () => {
  it('should have correct default values', () => {
    expect(
      settingDefinitions.map(def => {
        return {
          ...omit(def, [
            'defaultValue',
            'validation',
            'label',
            'description',
            'includeAgents',
            'excludeAgents'
          ]),
          validationName: def.validation.name
        };
      })
    ).toMatchSnapshot();
  });
});

function getSettingKeysForAgent(agentName: AgentName | undefined) {
  const definitions = settingDefinitions.filter(filterByAgent(agentName));
  return definitions.map(def => def.key);
}
