/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';

export interface Tab {
  key: string;
  label: string;
}

type AllKeys = keyof NonNullable<Transaction> | keyof NonNullable<APMError>;
interface ConfigItem<T extends AllKeys> {
  key: T;
  label: string;
  required: boolean;
  presortedKeys: Array<
    T extends keyof Transaction
      ? keyof NonNullable<Transaction[T]>
      : T extends keyof APMError
      ? keyof NonNullable<APMError[T]>
      : never
  >;
}

export const PROPERTY_CONFIG = [
  {
    key: 'url',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.urlLabel', {
      defaultMessage: 'Url'
    }),
    required: false,
    presortedKeys: []
  } as ConfigItem<'url'>,
  {
    key: 'http',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.httpLabel', {
      defaultMessage: 'HTTP'
    }),
    required: false,
    presortedKeys: []
  } as ConfigItem<'http'>,
  {
    key: 'host',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.hostLabel', {
      defaultMessage: 'Host'
    }),
    required: false,
    presortedKeys: ['hostname', 'architecture', 'platform']
  } as ConfigItem<'host'>,
  {
    key: 'service',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.serviceLabel', {
      defaultMessage: 'Service'
    }),
    required: false,
    presortedKeys: ['runtime', 'framework', 'agent', 'version']
  } as ConfigItem<'service'>,
  {
    key: 'process',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.processLabel', {
      defaultMessage: 'Process'
    }),
    required: false,
    presortedKeys: ['pid', 'title', 'args']
  } as ConfigItem<'process'>,
  {
    key: 'user',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.userLabel', {
      defaultMessage: 'User'
    }),
    required: true,
    presortedKeys: ['id', 'username', 'email']
  } as ConfigItem<'user'>,
  {
    key: 'labels',
    label: i18n.translate('xpack.apm.propertiesTable.tabs.labelsLabel', {
      defaultMessage: 'Labels'
    }),
    required: true,
    presortedKeys: []
  } as ConfigItem<'labels'>
];
