/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { getIntegerRt } from '../../../../../common/agent_configuration/runtime_types/integer_rt';
import { OnFormChangeFn, PackagePolicyVars } from '../typings';
import { SettingsForm } from './settings_form';
import { SettingDefinition } from './typings';
import { handleFormChange, isSettingsFormValid, OPTIONAL_LABEL } from './utils';

const advancedSettings: SettingDefinition[] = [
  {
    key: 'rum_event_rate_limit',
    type: 'integer',
    label: 'Rate limit events per IP',
    labelAppend: OPTIONAL_LABEL,
    helpText: 'Maximum number of events allowed per IP per second.',
    rowTitle: 'Limits',
    rowDescription: 'Configure authentication for the agent',
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'rum_event_rate_lru_size',
    type: 'integer',
    label: 'Rate limit cache size',
    labelAppend: OPTIONAL_LABEL,
    helpText: 'Number of unique IPs to be cached for the rate limiter.',
    validation: getIntegerRt({ min: 1 }),
  },
  {
    key: 'rum_library_pattern',
    type: 'text',
    label: 'Library Frame Pattern',
    labelAppend: OPTIONAL_LABEL,
    helpText:
      "Identify library frames by matching a stacktrace frame's file_name and abs_path against this regexp.",
  },
  {
    key: 'rum_allow_service_names',
    type: 'combo',
    label: 'Allowed service names',
    labelAppend: OPTIONAL_LABEL,
    rowTitle: 'Allowed service names',
    rowDescription: 'Configure authentication for the agent',
  },
];

const basicSettings: SettingDefinition[] = [
  {
    key: 'rum_allow_headers',
    type: 'combo',
    label: 'Allowed origin headers',
    labelAppend: OPTIONAL_LABEL,
    helpText: 'Allowed Origin headers to be sent by User Agents.',
    rowTitle: 'Custom headers',
    rowDescription: 'Configure authentication for the agent',
  },
  {
    key: 'rum_allow_origins',
    type: 'combo',
    label: 'Access-Control-Allow-Headers',
    labelAppend: OPTIONAL_LABEL,
    helpText:
      'Supported Access-Control-Allow-Headers in addition to "Content-Type", "Content-Encoding" and "Accept".',
  },
  {
    key: 'rum_response_headers',
    type: 'area',
    label: 'Custom HTTP response headers',
    labelAppend: OPTIONAL_LABEL,
    helpText: 'Added to RUM responses, e.g. for security policy compliance.',
  },
  {
    key: 'advanced_option',
    type: 'advanced_option',
    settings: advancedSettings,
  },
];

const ENABLE_RUM_KEY = 'enable_rum';
const rumSettings: SettingDefinition[] = [
  {
    key: ENABLE_RUM_KEY,
    type: 'boolean',
    rowTitle: 'Enable RUM',
    rowDescription: 'Enable Real User Monitoring (RUM)',
    settings: basicSettings,
  },
];

const rumFields = [...basicSettings, ...advancedSettings];

function validateRUMForm(vars: PackagePolicyVars) {
  // only validates RUM when its flag is enabled
  return !vars[ENABLE_RUM_KEY].value || isSettingsFormValid(rumFields, vars);
}

interface Props {
  vars: PackagePolicyVars;
  onChange: OnFormChangeFn;
}

export function RUMSettingsForm({ vars, onChange }: Props) {
  return (
    <SettingsForm
      title="Real User Monitoring"
      subtitle="Manage the configuration of the RUM JS agent."
      settings={rumSettings}
      vars={vars}
      onChange={(key, value) => {
        const { newVars, isValid } = handleFormChange({
          vars,
          key,
          value,
          validateForm: validateRUMForm,
        });
        onChange(newVars, isValid);
      }}
    />
  );
}
