/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get, indexBy, uniq } from 'lodash';
import { first, has } from 'lodash';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';

export type PropertyTabKey =
  | keyof Transaction
  | keyof APMError
  | 'transaction.custom'
  | 'error.custom';

export interface PropertyTab {
  key: PropertyTabKey;
  label: string;
}

interface TabConfig extends PropertyTab {
  required: boolean;
  presortedKeys: string[];
}

export function getTabsFromObject(obj: Transaction | APMError): PropertyTab[] {
  return TAB_CONFIG.filter(
    ({ key, required }) => required || has(obj, key)
  ).map(({ key, label }) => ({ key, label }));
}

export type KeySorter = (data: StringMap, parentKey?: string) => string[];

export const sortKeysByConfig: KeySorter = (object, currentKey) => {
  const indexedPropertyConfig = indexBy(TAB_CONFIG, 'key');
  const presorted = get(
    indexedPropertyConfig,
    `${currentKey}.presortedKeys`,
    []
  );
  return uniq([...presorted, ...Object.keys(object).sort()]);
};

export function getCurrentTab<T extends { key: string; label: string }>(
  tabs: T[] = [],
  currentTabKey: string | undefined
): T {
  const selectedTab = tabs.find(({ key }) => key === currentTabKey);
  return selectedTab ? selectedTab : first(tabs) || {};
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
