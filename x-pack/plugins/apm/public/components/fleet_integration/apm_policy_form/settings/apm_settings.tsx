/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import React from 'react';
import { OnFormChangeFn, PackagePolicyValues } from '../typings';
import { Field, Settings, SettingsForm } from './settings_form';
import { handleFormChange } from './utils';

const basicFields: Field[] = [
  {
    key: 'host',
    type: 'text',
    required: true,
    label: 'Host',
    title: 'Server configuration',
    description:
      'Choose a name and description to help identify how this integration will be used.',
  },
  {
    key: 'url',
    type: 'text',
    required: true,
    label: 'URL',
  },
  {
    key: 'api_key_enabled',
    type: 'bool',
    required: false,
    label: 'API key for agent authentication',
    helpText: 'Enable API Key auth between APM Server and APM Agents.',
  },
];

const advancedFields: Field[] = [
  {
    key: 'max_header_bytes',
    type: 'text',
    required: false,
    label: "Maximum size of a request's header (bytes)",
    title: 'Limits',
    description:
      'Set limits on request headers sizes and timing configurations.',
  },
  {
    key: 'idle_timeout',
    type: 'text',
    required: false,
    label: 'Idle time before underlying connection is closed',
  },
  {
    key: 'read_timeout',
    type: 'text',
    required: false,
    label: 'Maximum duration for reading an entire request',
  },
  {
    key: 'shutdown_timeout',
    type: 'text',
    required: false,
    label: 'Maximum duration before releasing resources when shutting down',
  },
  {
    key: 'write_timeout',
    type: 'text',
    required: false,
    label: 'Maximum duration for writing a response',
  },
  {
    key: 'max_event_bytes',
    type: 'text',
    required: false,
    label: 'Maximum size per event (bytes)',
  },
  {
    key: 'max_connections',
    type: 'text',
    required: false,
    label: 'Simultaneously accepted connections',
  },
  {
    key: 'response_headers',
    type: 'area',
    required: false,
    label: 'Custom HTTP headers added to HTTP responses',
    helpText: 'Might be used for security policy compliance.',
    title: 'Custom headers',
    description:
      'Set limits on request headers sizes and timing configurations.',
  },
  {
    key: 'api_key_limit',
    type: 'text',
    required: false,
    label: 'Number of keys',
    helpText: 'Might be used for security policy compliance.',
    title: 'Maximum number of API keys of Agent authentication',
    description:
      'Restrict number of unique API keys per minute, used for auth between aPM Agents and Server.',
  },
  {
    key: 'capture_personal_data',
    type: 'bool',
    required: false,
    title: 'Capture personal data',
    description: 'Capture personal data such as IP or User Agent',
  },
  {
    key: 'default_service_environment',
    type: 'text',
    required: false,
    label: 'Default Service Environment',
    title: 'Service configuration',
    description:
      'Default service environment to record in events which have no service environment defined.',
  },
  {
    key: 'expvar_enabled',
    type: 'bool',
    required: false,
    title: 'Enable APM Server Golang expvar support',
    description: 'Exposed under /debug/vars',
  },
];

const apmSettings: Settings = {
  title: 'General',
  subtitle: 'Settings for the APM integration.',
  requiredErrorMessage: 'Required field',
  fields: [
    ...basicFields,
    {
      type: 'advanced_option',
      fields: advancedFields,
    },
  ],
};

const apmFields = [...basicFields, ...advancedFields];

function validateAPMForm(values: PackagePolicyValues) {
  return apmFields
    .filter((field) => field.required)
    .every((field) => !isEmpty(values[field.key].value));
}

interface Props {
  values: PackagePolicyValues;
  onChange: OnFormChangeFn;
}

export function APMSettingsForm({ values, onChange }: Props) {
  return (
    <SettingsForm
      settings={apmSettings}
      values={values}
      onChange={(key, value) => {
        const { newValues, isValid } = handleFormChange({
          values,
          key,
          value,
          validateForm: validateAPMForm,
        });
        onChange(newValues, isValid);
      }}
    />
  );
}
