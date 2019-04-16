/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { APMError } from '../../../../typings/es_schemas/ui/APMError';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';

export type PropertyKey =
  | keyof Transaction
  | keyof APMError
  | 'metadata'
  | 'transaction.custom'
  | 'error.custom';

export interface Property {
  key: PropertyKey;
  label: string;
}

export interface PropertyConfig extends Property {
  required: boolean;
  presortedKeys: string[];
}

export const PROPERTY_CONFIG: PropertyConfig[] = [
  {
    key: 'labels',
    label: i18n.translate('xpack.apm.propertiesTable.properties.labelsLabel', {
      defaultMessage: 'Labels'
    }),
    required: true,
    presortedKeys: []
  },
  {
    key: 'http',
    label: i18n.translate('xpack.apm.propertiesTable.properties.httpLabel', {
      defaultMessage: 'HTTP'
    }),
    required: false,
    presortedKeys: []
  },
  {
    key: 'host',
    label: i18n.translate('xpack.apm.propertiesTable.properties.hostLabel', {
      defaultMessage: 'Host'
    }),
    required: false,
    presortedKeys: ['hostname', 'architecture', 'platform']
  },
  {
    key: 'container',
    label: i18n.translate(
      'xpack.apm.propertiesTable.properties.containerLabel',
      {
        defaultMessage: 'Container'
      }
    ),
    required: false,
    presortedKeys: []
  },
  {
    key: 'service',
    label: i18n.translate('xpack.apm.propertiesTable.properties.serviceLabel', {
      defaultMessage: 'Service'
    }),
    required: false,
    presortedKeys: ['runtime', 'framework', 'version']
  },
  {
    key: 'process',
    label: i18n.translate('xpack.apm.propertiesTable.properties.processLabel', {
      defaultMessage: 'Process'
    }),
    required: false,
    presortedKeys: ['pid', 'title', 'args']
  },
  {
    key: 'agent',
    label: i18n.translate('xpack.apm.propertiesTable.properties.agentLabel', {
      defaultMessage: 'Agent'
    }),
    required: false,
    presortedKeys: []
  },
  {
    key: 'url',
    label: i18n.translate('xpack.apm.propertiesTable.properties.urlLabel', {
      defaultMessage: 'URL'
    }),
    required: false,
    presortedKeys: []
  },
  {
    key: 'user',
    label: i18n.translate('xpack.apm.propertiesTable.properties.userLabel', {
      defaultMessage: 'User'
    }),
    required: true,
    presortedKeys: ['id', 'username', 'email']
  },
  {
    key: 'transaction.custom',
    label: i18n.translate(
      'xpack.apm.propertiesTable.properties.transactionCustomLabel',
      {
        defaultMessage: 'Custom'
      }
    ),
    required: false,
    presortedKeys: []
  },
  {
    key: 'error.custom',
    label: i18n.translate(
      'xpack.apm.propertiesTable.properties.errorCustomLabel',
      {
        defaultMessage: 'Custom'
      }
    ),
    required: false,
    presortedKeys: []
  }
];
