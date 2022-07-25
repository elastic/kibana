/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { get } from 'lodash';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { STORAGE_KEY } from '../../../common/constants';

interface TableValues {
  filterText: any;
  pageIndex: any;
  sortKey: any;
  sortOrder: any;
}

interface EuiTableValues {
  sort: any;
  page: any;
}

export const tableStorageGetter = (keyPrefix: string) => {
  return (storage: Storage): TableValues => {
    const localStorageData = storage.get(STORAGE_KEY) || {};
    const filterText = get(localStorageData, [keyPrefix, 'filterText']);
    const pageIndex = get(localStorageData, [keyPrefix, 'pageIndex']);
    const sortKey = get(localStorageData, [keyPrefix, 'sortKey']);
    const sortOrder = get(localStorageData, [keyPrefix, 'sortOrder']);

    return { pageIndex, filterText, sortKey, sortOrder };
  };
};

export const tableStorageSetter = (keyPrefix: string) => {
  return (storage: Storage, { filterText, pageIndex, sortKey, sortOrder }: TableValues) => {
    const localStorageData = storage.get(STORAGE_KEY) || {};

    set(localStorageData, [keyPrefix, 'filterText'], filterText || undefined); // don`t store empty data
    set(localStorageData, [keyPrefix, 'pageIndex'], pageIndex || undefined);
    set(localStorageData, [keyPrefix, 'sortKey'], sortKey || undefined);
    set(localStorageData, [keyPrefix, 'sortOrder'], sortOrder || undefined);

    storage.set(STORAGE_KEY, localStorageData);

    return localStorageData;
  };
};

export const euiTableStorageGetter = (keyPrefix: string) => {
  return (storage: Storage): EuiTableValues => {
    const localStorageData = storage.get(STORAGE_KEY) || {};
    const sort = get(localStorageData, [keyPrefix, 'sort']);
    const page = get(localStorageData, [keyPrefix, 'page']);

    return { page, sort };
  };
};

export const euiTableStorageSetter = (keyPrefix: string) => {
  return (storage: Storage, { sort, page }: EuiTableValues) => {
    const localStorageData = storage.get(STORAGE_KEY) || {};

    set(localStorageData, [keyPrefix, 'sort'], sort || undefined); // don`t store empty data
    set(localStorageData, [keyPrefix, 'page'], page || undefined);

    storage.set(STORAGE_KEY, localStorageData);

    return localStorageData;
  };
};
