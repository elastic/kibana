/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { PackagePolicyValues } from '..';
import { Settings, Field } from './settings_form';

const basicFields: Field[] = [
  {
    key: 'rum_allow_service_names',
    type: 'text',
    required: false,
    label: 'Allowed origin headers',
    helpText: 'Allowed Origin headers to be sent by User Agents.',
    title: 'Custom headers',
    description: 'Configure authentication for the agent',
  },
  {
    key: 'rum_allow_origins',
    type: 'text',
    required: false,
    label: 'Access-Control-Allow-Headers',
    helpText:
      'Supported Access-Control-Allow-Headers in addition to "Content-Type", "Content-Encoding" and "Accept".',
  },
  {
    key: 'rum_response_headers',
    type: 'text',
    required: false,
    label: 'Custom HTTP response headers',
    helpText: 'Added to RUM responses, e.g. for security policy compliance.',
  },
];

const advancedFields: Field[] = [
  {
    key: 'rum_event_rate_limit',
    type: 'text',
    required: false,
    label: 'Rate limit events per IP',
    helpText: 'Maximum number of events allowed per IP per second.',
    title: 'Limits',
    description: 'Configure authentication for the agent',
  },
  {
    key: 'rum_event_rate_lru_size',
    type: 'text',
    required: false,
    label: 'Rate limit cache size',
    helpText: 'Number of unique IPs to be cached for the rate limiter.',
  },
  {
    key: 'rum_library_pattern',
    type: 'text',
    required: false,
    label: 'Rate limit cache size',
    helpText: 'Number of unique IPs to be cached for the rate limiter.',
  },
  {
    key: 'rum_allow_service_names',
    type: 'text',
    required: false,
    label: 'Allowed service names',
    title: 'Allowed service names',
    description: 'Configure authentication for the agent',
  },
];

const ENABLE_RUM_KEY = 'enable_rum';
export const rumSettings: Settings = {
  title: 'Real User Monitoring',
  subtitle: 'Manage the configuration of the RUM JS agent.',
  fields: [
    {
      key: ENABLE_RUM_KEY,
      type: 'bool',
      required: false,
      title: 'Enable RUM',
      description: 'Enable Real User Monitoring (RUM)',
      fields: [
        ...basicFields,
        {
          type: 'advanced_option',
          fields: advancedFields,
        },
      ],
    },
  ],
};

const rumFields = [...basicFields, ...advancedFields];

export function validateRumForm(values: PackagePolicyValues) {
  // if RUM is disable it means that its form is valid
  if (!values[ENABLE_RUM_KEY].value) {
    return true;
  }
  return rumFields
    .filter((field) => field.required)
    .every((field) => !isEmpty(values[field.key].value));
}
