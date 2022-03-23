/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { GetInfoResponse } from '../../../public/types';
import { KibanaAssetType, ElasticsearchAssetType } from '../../../common/types';

export const item: GetInfoResponse['item'] = {
  name: 'okta',
  title: 'Okta',
  version: '1.2.0',
  release: 'ga',
  description: 'This Elastic integration collects events from Okta',
  type: 'integration',
  download: '/epr/okta/okta-1.2.0.zip',
  // path: '/package/okta/1.2.0',
  icons: [
    {
      src: '/img/okta-logo.svg',
      // path: '/package/okta/1.2.0/img/okta-logo.svg',
      title: 'Okta',
      size: '216x216',
      type: 'image/svg+xml',
    },
  ],
  format_version: '1.0.0',
  readme: '/package/okta/1.2.0/docs/README.md',
  license: 'basic',
  categories: ['security'],
  conditions: {
    kibana: { version: '^7.14.0' },
  },
  screenshots: [
    {
      src: '/img/filebeat-okta-dashboard.png',
      // path: '/package/okta/1.2.0/img/filebeat-okta-dashboard.png',
      title: 'Okta Dashboard',
      size: '1024x662',
      type: 'image/png',
    },
  ],
  assets: {
    kibana: {
      dashboard: [
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.dashboard,
          file: 'okta-749203a0-67b1-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/dashboard/okta-749203a0-67b1-11ea-a76f-bf44814e437d.json',
        },
      ],
      map: [
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.map,
          file: 'okta-281ca660-67b1-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/map/okta-281ca660-67b1-11ea-a76f-bf44814e437d.json',
        },
      ],
      search: [
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.search,
          file: 'okta-21028750-67ca-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/search/okta-21028750-67ca-11ea-a76f-bf44814e437d.json',
        },
      ],
      visualization: [
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.visualization,
          file: 'okta-0a784b30-67c7-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/visualization/okta-0a784b30-67c7-11ea-a76f-bf44814e437d.json',
        },
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.visualization,
          file: 'okta-545d6a00-67ae-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/visualization/okta-545d6a00-67ae-11ea-a76f-bf44814e437d.json',
        },
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.visualization,
          file: 'okta-7c6ec080-67c6-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/visualization/okta-7c6ec080-67c6-11ea-a76f-bf44814e437d.json',
        },
        {
          pkgkey: 'okta-1.2.0',
          service: 'kibana',
          type: KibanaAssetType.visualization,
          file: 'okta-cda883a0-67c6-11ea-a76f-bf44814e437d.json',
          // path: 'okta-1.2.0/kibana/visualization/okta-cda883a0-67c6-11ea-a76f-bf44814e437d.json',
        },
      ],
      //  TODO: These were missing from the response, but typed to be required.
      index_pattern: [],
      lens: [],
      ml_module: [],
      osquery_pack_asset: [],
      security_rule: [],
      tag: [],
    },
    elasticsearch: {
      ingest_pipeline: [
        {
          pkgkey: 'okta-1.2.0',
          service: 'elasticsearch',
          type: ElasticsearchAssetType.ingestPipeline,
          file: 'default.yml',
          dataset: 'system',
          // path: 'okta-1.2.0/data_stream/system/elasticsearch/ingest_pipeline/default.yml',
        },
      ],
      //  TODO: These were missing from the response, but typed to be required.
      component_template: [],
      data_stream_ilm_policy: [],
      ilm_policy: [],
      index_template: [],
      transform: [],
      ml_model: [],
    },
  },
  policy_templates: [
    {
      name: 'okta',
      title: 'Okta logs',
      description: 'Collect logs from Okta',
      inputs: [
        {
          type: 'httpjson',
          vars: [
            {
              name: 'api_key',
              type: 'text',
              title: 'API Key',
              multi: false,
              required: false,
              show_user: true,
            },
            {
              name: 'http_client_timeout',
              type: 'text',
              title: 'HTTP Client Timeout',
              multi: false,
              required: false,
              show_user: true,
            },
            {
              name: 'interval',
              type: 'text',
              title: 'Interval',
              multi: false,
              required: true,
              show_user: true,
              default: '60s',
            },
            {
              name: 'initial_interval',
              type: 'text',
              title: 'Initial Interval',
              multi: false,
              required: true,
              show_user: true,
              default: '24h',
            },
            {
              name: 'ssl',
              type: 'yaml',
              title: 'SSL',
              multi: false,
              required: false,
              show_user: true,
            },
            {
              name: 'url',
              type: 'text',
              title: 'Okta System Log API Url',
              multi: false,
              required: false,
              show_user: true,
            },
            {
              name: 'proxy_url',
              type: 'text',
              title: 'Proxy URL',
              description:
                'URL to proxy connections in the form of http[s]://<user>:<password>@<server name/ip>:<port>',
              multi: false,
              required: false,
              show_user: false,
            },
          ],
          title: 'Collect Okta logs via API',
          description: 'Collecting logs from Okta via API',
        },
      ],
      multiple: true,
    },
  ],
  data_streams: [
    {
      type: 'logs',
      dataset: 'okta.system',
      title: 'Okta system logs',
      release: 'experimental',
      ingest_pipeline: 'default',
      streams: [
        {
          input: 'httpjson',
          vars: [
            {
              name: 'tags',
              type: 'text',
              title: 'Tags',
              multi: true,
              required: true,
              show_user: false,
              default: ['forwarded', 'okta-system'],
            },
            {
              name: 'preserve_original_event',
              type: 'bool',
              title: 'Preserve original event',
              description:
                'Preserves a raw copy of the original event, added to the field `event.original`',
              multi: false,
              required: true,
              show_user: true,
              default: false,
            },
            {
              name: 'processors',
              type: 'yaml',
              title: 'Processors',
              description:
                'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata. This executes in the agent before the logs are parsed. See [Processors](https://www.elastic.co/guide/en/beats/filebeat/current/filtering-and-enhancing-data.html) for details.\n',
              multi: false,
              required: false,
              show_user: false,
            },
          ],
          template_path: 'httpjson.yml.hbs',
          title: 'Okta system logs',
          description: 'Collect Okta system logs',
          enabled: true,
        },
      ],
      package: 'okta',
      path: 'system',
    },
  ],
  owner: {
    github: 'elastic/security-external-integrations',
  },
  latestVersion: '1.2.0',
  removable: true,
  status: 'not_installed',
};
