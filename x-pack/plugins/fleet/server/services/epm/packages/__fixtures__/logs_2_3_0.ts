/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOGS_2_3_0_PACKAGE_INFO = {
  name: 'log',
  version: '2.3.0',
  title: 'Custom Logs',
  owner: { github: 'elastic/elastic-agent-data-plane' },
  type: 'input',
  categories: ['custom', 'custom_logs'],
  conditions: { 'kibana.version': '^8.8.0' },
  icons: [{ src: '/img/icon.svg', type: 'image/svg+xml' }],
  policy_templates: [
    {
      name: 'logs',
      title: 'Custom log file',
      description: 'Collect your custom log files.',
      multiple: true,
      input: 'logfile',
      type: 'logs',
      template_path: 'input.yml.hbs',
      vars: [
        {
          name: 'paths',
          required: true,
          title: 'Log file path',
          description: 'Path to log files to be collected',
          type: 'text',
          multi: true,
        },
        {
          name: 'exclude_files',
          required: false,
          show_user: false,
          title: 'Exclude files',
          description: 'Patterns to be ignored',
          type: 'text',
          multi: true,
        },
        {
          name: 'ignore_older',
          type: 'text',
          title: 'Ignore events older than',
          default: '72h',
          required: false,
          show_user: false,
          description:
            'If this option is specified, events that are older than the specified amount of time are ignored. Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h".',
        },
        {
          name: 'data_stream.dataset',
          required: true,
          title: 'Dataset name',
          description:
            "Set the name for your dataset. Changing the dataset will send the data to a different index. You can't use `-` in the name of a dataset and only valid characters for [Elasticsearch index names](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html).\n",
          type: 'text',
        },
        {
          name: 'tags',
          type: 'text',
          title: 'Tags',
          description: 'Tags to include in the published event',
          multi: true,
          show_user: false,
        },
        {
          name: 'processors',
          type: 'yaml',
          title: 'Processors',
          multi: false,
          required: false,
          show_user: false,
          description:
            'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata. This executes in the agent before the logs are parsed. See [Processors](https://www.elastic.co/guide/en/beats/filebeat/current/filtering-and-enhancing-data.html) for details.',
        },
        {
          name: 'custom',
          title: 'Custom configurations',
          description:
            'Here YAML configuration options can be used to be added to your configuration. Be careful using this as it might break your configuration file.\n',
          type: 'yaml',
          default: '',
        },
      ],
    },
  ],
  elasticsearch: {},
  description: 'Collect custom logs with Elastic Agent.',
  format_version: '2.6.0',
  readme: '/package/log/2.3.0/docs/README.md',
  release: 'ga',
  latestVersion: '2.3.2',
  assets: {},
  licensePath: '/package/log/2.3.0/LICENSE.txt',
  keepPoliciesUpToDate: false,
  status: 'not_installed',
};

export const LOGS_2_3_0_ASSETS_MAP = new Map([
  [
    'log-2.3.0/agent/input/input.yml.hbs',
    Buffer.from(`paths:
{{#each paths}}
  - {{this}}
{{/each}}

{{#if exclude_files}}
exclude_files:
{{#each exclude_files}}
  - {{this}}
{{/each}}
{{/if}}
{{#if ignore_older}}
ignore_older: {{ignore_older}}
{{/if}}
data_stream:
  dataset: {{data_stream.dataset}}
{{#if processors.length}}
processors:
{{processors}}
{{/if}}
{{#if tags.length}}
tags:
{{#each tags as |tag i|}}
- {{tag}}
{{/each}}
{{/if}}

{{custom}}
`),
  ],
]);
