/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { filterByAgent, settingDefinitions } from '../setting_definitions';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';
import { SettingDefinition } from './types';

describe('filterByAgent', () => {
  describe('when `excludeAgents` is dotnet and nodejs', () => {
    const setting = {
      key: 'my-setting',
      excludeAgents: ['dotnet', 'nodejs'],
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
      includeAgents: ['dotnet', 'nodejs'],
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
        'capture_body',
        'capture_headers',
        'recording',
        'span_frames_min_duration',
        'stack_trace_limit',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });

    it('java', () => {
      expect(getSettingKeysForAgent('java')).toEqual([
        'api_request_size',
        'api_request_time',
        'capture_body',
        'capture_headers',
        'circuit_breaker_enabled',
        'enable_log_correlation',
        'profiling_inferred_spans_enabled',
        'profiling_inferred_spans_excluded_classes',
        'profiling_inferred_spans_included_classes',
        'profiling_inferred_spans_min_duration',
        'profiling_inferred_spans_sampling_interval',
        'recording',
        'server_timeout',
        'span_frames_min_duration',
        'stack_trace_limit',
        'stress_monitor_cpu_duration_threshold',
        'stress_monitor_gc_relief_threshold',
        'stress_monitor_gc_stress_threshold',
        'stress_monitor_system_cpu_relief_threshold',
        'stress_monitor_system_cpu_stress_threshold',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });

    it('js-base', () => {
      expect(getSettingKeysForAgent('js-base')).toEqual([
        'recording',
        'transaction_sample_rate',
      ]);
    });

    it('rum-js', () => {
      expect(getSettingKeysForAgent('rum-js')).toEqual([
        'recording',
        'transaction_sample_rate',
      ]);
    });

    it('nodejs', () => {
      expect(getSettingKeysForAgent('nodejs')).toEqual([
        'capture_body',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });

    it('python', () => {
      expect(getSettingKeysForAgent('python')).toEqual([
        'api_request_size',
        'api_request_time',
        'capture_body',
        'capture_headers',
        'recording',
        'span_frames_min_duration',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });

    it('dotnet', () => {
      expect(getSettingKeysForAgent('dotnet')).toEqual([
        'capture_body',
        'capture_headers',
        'log_level',
        'recording',
        'span_frames_min_duration',
        'stack_trace_limit',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });

    it('ruby', () => {
      expect(getSettingKeysForAgent('ruby')).toEqual([
        'api_request_size',
        'api_request_time',
        'capture_body',
        'capture_headers',
        'log_level',
        'recording',
        'span_frames_min_duration',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });

    it('"All" services (no agent name)', () => {
      expect(getSettingKeysForAgent(undefined)).toEqual([
        'capture_body',
        'transaction_max_spans',
        'transaction_sample_rate',
      ]);
    });
  });
});

describe('settingDefinitions', () => {
  it('should have correct default values', () => {
    expect(
      settingDefinitions.map((def) => {
        return {
          ...omit(def, [
            'category',
            'defaultValue',
            'description',
            'excludeAgents',
            'includeAgents',
            'label',
            'validation',
          ]),
          validationName: def.validation.name,
        };
      })
    ).toMatchSnapshot();
  });
});

function getSettingKeysForAgent(agentName: AgentName | undefined) {
  const definitions = settingDefinitions.filter(filterByAgent(agentName));
  return definitions.map((def) => def.key);
}
