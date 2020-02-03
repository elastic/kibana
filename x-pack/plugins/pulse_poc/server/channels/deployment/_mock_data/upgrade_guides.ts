/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UpgradeAssistantGuideDocs } from '../check_upgrade_assistant';

export const mockedValues: UpgradeAssistantGuideDocs[] = [
  {
    fromVersion: '8.0.0',
    targetVersion: '8.1.0',
    guide: [
      {
        description: 'Prepare to upgrade to 8.1',
        docLink: undefined,
        substeps: [
          {
            description: 'Backup your data',
            docLink:
              'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html',
          },
        ],
      },
      {
        description: 'Upgrade the stack to 8.1',
        docLink: undefined,
        substeps: [
          {
            description: 'Rolling upgrade to Elasticsearch 8.1',
            docLink:
              'https://www.elastic.co/guide/en/elasticsearch/reference/master/rolling-upgrades.html',
          },
          {
            description: 'Upgrade to Kibana 8.1',
            docLink: 'https://www.elastic.co/guide/en/kibana/master/upgrade.html',
            checks: [
              {
                method: 'indices.exists',
                options: {
                  index: '.kibana',
                },
                path: '',
                value: {
                  eq: true,
                },
              },
            ],
          },
          {
            description: 'Upgrade to Logstash 8.1',
            docLink: 'https://www.elastic.co/guide/en/logstash/master/upgrade.html',
            checks: [
              {
                method: 'indices.exists',
                options: {
                  index: '.logstash',
                },
                path: '',
                value: {
                  eq: true,
                },
              },
            ],
          },
        ],
      },
    ],
  },
];
