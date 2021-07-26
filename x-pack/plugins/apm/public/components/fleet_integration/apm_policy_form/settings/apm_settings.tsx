/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { getDurationRt } from '../../../../../common/agent_configuration/runtime_types/duration_rt';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { OnFormChangeFn, PackagePolicyVars } from '../typings';
import { SettingsForm } from './settings_form';
import { SettingDefinition } from './types';
import {
  handleFormChange,
  isSettingsFormValid,
  OPTIONAL_LABEL,
  REQUIRED_LABEL,
} from './utils';

const basicSettings: SettingDefinition[] = [
  {
    type: 'text',
    key: 'host',
    labelAppend: REQUIRED_LABEL,
    label: 'Host',
    rowTitle: 'Server configuration',
    rowDescription:
      'Choose a name and description to help identify how this integration will be used.',
    required: true,
  },
  {
    type: 'text',
    key: 'url',
    labelAppend: REQUIRED_LABEL,
    label: 'URL',
    required: true,
  },
  {
    type: 'text',
    key: 'secret_token',
    labelAppend: OPTIONAL_LABEL,
    label: 'Secret token',
  },
  {
    type: 'boolean',
    key: 'api_key_enabled',
    labelAppend: OPTIONAL_LABEL,
    placeholder: 'API key for agent authentication',
    helpText: 'Enable API Key auth between APM Server and APM Agents.',
  },
];

const advancedSettings: SettingDefinition[] = [
  {
    key: 'max_header_bytes',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: "Maximum size of a request's header (bytes)",
    rowTitle: 'Limits',
    rowDescription:
      'Set limits on request headers sizes and timing configurations.',
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'idle_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: 'Idle time before underlying connection is closed',
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'read_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: 'Maximum duration for reading an entire request',
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'shutdown_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: 'Maximum duration before releasing resources when shutting down',
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'write_timeout',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: 'Maximum duration for writing a response',
    validation: getDurationRt({ min: '1ms' }),
  },
  {
    key: 'max_event_bytes',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: 'Maximum size per event (bytes)',
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'max_connections',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: 'Simultaneously accepted connections',
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'response_headers',
    type: 'area',
    labelAppend: OPTIONAL_LABEL,
    label: 'Custom HTTP headers added to HTTP responses',
    helpText: 'Might be used for security policy compliance.',
    rowTitle: 'Custom headers',
    rowDescription:
      'Set limits on request headers sizes and timing configurations.',
  },
  {
    key: 'api_key_limit',
    type: 'integer',
    labelAppend: OPTIONAL_LABEL,
    label: 'Number of keys',
    helpText: 'Might be used for security policy compliance.',
    rowTitle: 'Maximum number of API keys of Agent authentication',
    rowDescription:
      'Restrict number of unique API keys per minute, used for auth between aPM Agents and Server.',
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'capture_personal_data',
    type: 'boolean',
    rowTitle: 'Capture personal data',
    rowDescription: 'Capture personal data such as IP or User Agent',
  },
  {
    key: 'default_service_environment',
    type: 'text',
    labelAppend: OPTIONAL_LABEL,
    label: 'Default Service Environment',
    rowTitle: 'Service configuration',
    rowDescription:
      'Default service environment to record in events which have no service environment defined.',
  },
  {
    key: 'expvar_enabled',
    type: 'boolean',
    labelAppend: OPTIONAL_LABEL,
    rowTitle: 'Enable APM Server Golang expvar support',
    rowDescription: 'Exposed under /debug/vars',
  },
];

const apmFields = [...basicSettings, ...advancedSettings];
function validateAPMForm(vars: PackagePolicyVars) {
  return isSettingsFormValid(apmFields, vars);
}

const advancedOptionsSettings: SettingDefinition = {
  key: 'advanced_option',
  type: 'advanced_option',
  settings: advancedSettings,
};
const apmSettings = [...basicSettings, advancedOptionsSettings];

interface Props {
  vars: PackagePolicyVars;
  onChange: OnFormChangeFn;
}
export function APMSettingsForm({ vars, onChange }: Props) {
  return (
    <SettingsForm
      title="General"
      subtitle="Settings for the APM integration."
      settings={apmSettings}
      vars={vars}
      onChange={(key, value) => {
        const { newVars, isValid } = handleFormChange({
          vars,
          key,
          value,
          validateForm: validateAPMForm,
        });
        onChange(newVars, isValid);
      }}
    />
  );
}
