/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, indexBy, uniq } from 'lodash';
import { first, has } from 'lodash';
import { StringMap } from 'x-pack/plugins/apm/typings/common';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/ui/APMError';
import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/ui/Transaction';
import {
  PropertyTab,
  PropertyTabKey,
  TAB_CONFIG,
  TabConfig
} from './tabConfigConst';

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

export { TAB_CONFIG, TabConfig, PropertyTab, PropertyTabKey };
