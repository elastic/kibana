/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/ui/APMError';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/ui/Transaction';

export type PropertyTabKey =
  | keyof Transaction
  | keyof APMError
  | 'transaction.custom'
  | 'error.custom';

export interface PropertyTab {
  key: PropertyTabKey;
  label: string;
}

export interface TabConfig extends PropertyTab {
  required: boolean;
  presortedKeys: string[];
}

export const TAB_CONFIG: TabConfig[] = [
  {
    key: 'http',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.httpLabel', {
      defaultMessage: 'HTTP'
    }),
    required: false,
    presortedKeys: []
  },
  {
    key: 'host',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.hostLabel', {
      defaultMessage: 'Host'
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
    presortedKeys: ['runtime', 'framework', 'version']
  },
  {
    key: 'process',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.processLabel', {
      defaultMessage: 'Process'
    }),
    required: false,
    presortedKeys: ['pid', 'title', 'args']
  },
  {
    key: 'agent',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.agentLabel', {
      defaultMessage: 'Agent'
    }),
    required: false,
    presortedKeys: []
  },
  {
    key: 'url',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.urlLabel', {
      defaultMessage: 'URL'
    }),
    required: false,
    presortedKeys: []
  },
  {
    key: 'container',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.containerLabel', {
      defaultMessage: 'Container'
    }),
    required: false,
    presortedKeys: []
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
    key: 'labels',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.labelsLabel', {
      defaultMessage: 'Labels'
    }),
    required: true,
    presortedKeys: []
  },
  {
    key: 'transaction.custom',
    label: i18n.translate(
      'xpack.apm.propertiesTable.tabs.transactionCustomLabel',
      {
        defaultMessage: 'Custom'
      }
    ),
    required: false,
    presortedKeys: []
  },
  {
    key: 'error.custom',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.errorCustomLabel', {
      defaultMessage: 'Custom'
    }),
    required: false,
    presortedKeys: []
  }
];
