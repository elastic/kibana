/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DOCKER_2_11_0_PACKAGE_INFO = {
  name: 'docker',
  title: 'Docker',
  version: '2.11.0',
  release: 'ga',
  description: 'Collect metrics and logs from Docker instances with Elastic Agent.',
  type: 'integration',
  download: '/epr/docker/docker-2.11.0.zip',
  path: '/package/docker/2.11.0',
  icons: [
    {
      src: '/img/logo_docker.svg',
      path: '/package/docker/2.11.0/img/logo_docker.svg',
      title: 'logo docker',
      size: '32x32',
      type: 'image/svg+xml',
    },
  ],
  conditions: {
    kibana: {
      version: '^8.8.0',
    },
  },
  owner: {
    type: 'elastic',
    github: 'elastic/obs-cloudnative-monitoring',
  },
  categories: ['observability', 'containers'],
  signature_path: '/epr/docker/docker-2.11.0.zip.sig',
  format_version: '3.2.2',
  readme: '/package/docker/2.11.0/docs/README.md',
  license: 'basic',
  screenshots: [
    {
      src: '/img/docker-overview.png',
      path: '/package/docker/2.11.0/img/docker-overview.png',
      title: 'Docker Overview',
      size: '5120x2562',
      type: 'image/png',
    },
  ],
  assets: [
    '/package/docker/2.11.0/LICENSE.txt',
    '/package/docker/2.11.0/changelog.yml',
    '/package/docker/2.11.0/manifest.yml',
    '/package/docker/2.11.0/docs/README.md',
    '/package/docker/2.11.0/img/docker-overview.png',
    '/package/docker/2.11.0/img/logo_docker.svg',
    '/package/docker/2.11.0/data_stream/container/manifest.yml',
    '/package/docker/2.11.0/data_stream/container/sample_event.json',
    '/package/docker/2.11.0/data_stream/container_logs/manifest.yml',
    '/package/docker/2.11.0/data_stream/container_logs/sample_event.json',
    '/package/docker/2.11.0/data_stream/cpu/manifest.yml',
    '/package/docker/2.11.0/data_stream/cpu/sample_event.json',
    '/package/docker/2.11.0/data_stream/diskio/manifest.yml',
    '/package/docker/2.11.0/data_stream/diskio/sample_event.json',
    '/package/docker/2.11.0/data_stream/event/manifest.yml',
    '/package/docker/2.11.0/data_stream/event/sample_event.json',
    '/package/docker/2.11.0/data_stream/healthcheck/manifest.yml',
    '/package/docker/2.11.0/data_stream/healthcheck/sample_event.json',
    '/package/docker/2.11.0/data_stream/image/manifest.yml',
    '/package/docker/2.11.0/data_stream/image/sample_event.json',
    '/package/docker/2.11.0/data_stream/info/manifest.yml',
    '/package/docker/2.11.0/data_stream/info/sample_event.json',
    '/package/docker/2.11.0/data_stream/memory/manifest.yml',
    '/package/docker/2.11.0/data_stream/memory/sample_event.json',
    '/package/docker/2.11.0/data_stream/network/manifest.yml',
    '/package/docker/2.11.0/data_stream/network/sample_event.json',
    '/package/docker/2.11.0/kibana/dashboard/docker-AV4REOpp5NkDleZmzKkE.json',
    '/package/docker/2.11.0/kibana/search/docker-Metrics-Docker.json',
    '/package/docker/2.11.0/data_stream/container/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/container/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/container/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/container_logs/fields/agent.yml',
    '/package/docker/2.11.0/data_stream/container_logs/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/container_logs/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/container_logs/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/cpu/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/cpu/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/cpu/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/diskio/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/diskio/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/diskio/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/event/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/event/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/event/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/healthcheck/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/healthcheck/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/healthcheck/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/image/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/image/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/image/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/info/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/info/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/info/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/memory/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/memory/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/memory/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/network/fields/base-fields.yml',
    '/package/docker/2.11.0/data_stream/network/fields/ecs.yml',
    '/package/docker/2.11.0/data_stream/network/fields/fields.yml',
    '/package/docker/2.11.0/data_stream/container/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/container_logs/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/cpu/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/diskio/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/event/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/healthcheck/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/image/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/info/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/memory/agent/stream/stream.yml.hbs',
    '/package/docker/2.11.0/data_stream/network/agent/stream/stream.yml.hbs',
  ],
  policy_templates: [
    {
      name: 'docker',
      title: 'Docker logs and metrics',
      description: 'Collect logs and metrics from Docker instances',
      inputs: [
        {
          type: 'filestream',
          title: 'Collect Docker container logs',
          description: 'Collecting docker container logs',
        },
      ],
      multiple: true,
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'docker.container_logs',
      title: 'Docker container logs',
      release: 'ga',
      streams: [
        {
          input: 'filestream',
          vars: [
            {
              name: 'paths',
              type: 'text',
              title: 'Docker container log path',
              multi: true,
              required: true,
              show_user: false,
              default: ['/var/lib/docker/containers/${docker.container.id}/*-json.log'],
            },
            {
              name: 'containerParserStream',
              type: 'text',
              title: "Container parser's stream configuration",
              multi: false,
              required: true,
              show_user: false,
              default: 'all',
            },
            {
              name: 'condition',
              type: 'text',
              title: 'Condition',
              description:
                'Condition to filter when to apply this datastream. Refer to [Docker provider](https://www.elastic.co/guide/en/fleet/current/docker-provider.html) to find the available keys and to [Conditions](https://www.elastic.co/guide/en/fleet/current/dynamic-input-configuration.html#conditions) on how to use the available keys in conditions.',
              multi: false,
              required: false,
              show_user: true,
            },
            {
              name: 'additionalParsersConfig',
              type: 'yaml',
              title: 'Additional parsers configuration',
              multi: false,
              required: true,
              show_user: false,
              default:
                "# - ndjson:\n#     target: json\n#     ignore_decoding_error: true\n# - multiline:\n#     type: pattern\n#     pattern: '^\\['\n#     negate: true\n#     match: after\n",
            },
            {
              name: 'processors',
              type: 'yaml',
              title: 'Processors',
              description:
                'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata. This executes in the agent before the events are shipped. See [Processors](https://www.elastic.co/guide/en/beats/filebeat/current/filtering-and-enhancing-data.html) for details.',
              multi: false,
              required: false,
              show_user: false,
            },
          ],
          template_path: 'stream.yml.hbs',
          title: 'Collect Docker container logs',
          description: 'Collect Docker container logs',
          enabled: true,
        },
      ],
      package: 'docker',
      elasticsearch: {},
      path: 'container_logs',
    },
  ],
};

export const DOCKER_2_11_0_ASSETS_MAP = new Map([
  [
    'docker-2.11.0/data_stream/container_logs/agent/stream/stream.yml.hbs',
    Buffer.from(`id: docker-container-logs-\${docker.container.name}-\${docker.container.id}
paths:
{{#each paths}}
  - {{this}}
{{/each}}
{{#if condition}}
condition: {{ condition }}
{{/if}}
parsers:
- container:
    stream: {{ containerParserStream }}
    format: docker
{{ additionalParsersConfig }}

{{#if processors}}
processors:
{{processors}}
{{/if}}
`),
  ],
]);
