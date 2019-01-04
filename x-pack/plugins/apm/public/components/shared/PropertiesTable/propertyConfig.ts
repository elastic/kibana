/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export interface TabWithKey {
  key: string;
  label: string;
  required: boolean;
  presortedKeys: string[];
}

export interface Tab {
  key: string;
  label: string;
}

export const PROPERTY_CONFIG: TabWithKey[] = [
  {
    key: 'url',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.urlLabel', {
      defaultMessage: 'Url'
    }),
    required: false,
    presortedKeys: [
      'http_version',
      'method',
      'url',
      'socket',
      'headers',
      'body'
    ]
  },
  {
    key: 'http',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.httpLabel', {
      defaultMessage: 'HTTP'
    }),
    required: false,
    presortedKeys: ['status_code', 'headers', 'headers_sent', 'finished']
  },
  {
    key: 'system',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.systemLabel', {
      defaultMessage: 'System'
    }),
    required: false,
    presortedKeys: ['hostname', 'architecture', 'platform']
  },
  {
    key: 'service',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.serviceLabel', {
      defaultMessage: 'Service'
    }),
    required: false,
    presortedKeys: ['runtime', 'framework', 'agent', 'version']
  },
  {
    key: 'process',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.processLabel', {
      defaultMessage: 'Process'
    }),
    required: false,
    presortedKeys: ['pid', 'title', 'argv']
  },
  {
    key: 'user',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.userLabel', {
      defaultMessage: 'User'
    }),
    required: true,
    presortedKeys: ['id', 'username', 'email']
  },
  {
    key: 'tags',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.tagsLabel', {
      defaultMessage: 'Tags'
    }),
    required: true,
    presortedKeys: []
  },
  {
    key: 'custom',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.customLabel', {
      defaultMessage: 'Custom'
    }),
    required: true,
    presortedKeys: []
  }
];
