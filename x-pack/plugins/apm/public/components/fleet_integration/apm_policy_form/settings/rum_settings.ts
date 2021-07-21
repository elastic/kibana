/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Settings } from '../settings_form';

export const rumSettings: Settings = {
  title: 'Real User Monitoring',
  subtitle: 'Manage the configuration of the RUM JS agent.',
  fields: [
    {
      key: 'enable_rum',
      type: 'bool',
      required: true,
      defaultValue: false,
      title: 'Enable RUM',
      description: 'Enable Real User Monitoring (RUM)',
      fields: [
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
          helpText:
            'Added to RUM responses, e.g. for security policy compliance.',
        },
        {
          type: 'advanced_option',
          fields: [
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
              helpText:
                'Number of unique IPs to be cached for the rate limiter.',
            },
            {
              key: 'rum_library_pattern',
              type: 'text',
              required: false,
              label: 'Rate limit cache size',
              helpText:
                'Number of unique IPs to be cached for the rate limiter.',
            },
            {
              key: 'rum_allow_service_names',
              type: 'text',
              required: false,
              label: 'Allowed service names',
              title: 'Allowed service names',
              description: 'Configure authentication for the agent',
            },
          ],
        },
      ],
    },
  ],
};
