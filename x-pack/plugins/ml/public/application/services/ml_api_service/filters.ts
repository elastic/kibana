/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Service for querying filters, which hold lists of entities,
// for example a list of known safe URL domains.

import { http } from '../http_service';

import { basePath } from '.';
import type { Filter, FilterStats } from '../../../../common/types/filters';

export const filters = {
  filters(obj?: { filterId?: string }) {
    const filterId = obj && obj.filterId ? `/${obj.filterId}` : '';
    return http<Filter[]>({
      path: `${basePath()}/filters${filterId}`,
      method: 'GET',
    });
  },

  filtersStats() {
    return http<FilterStats[]>({
      path: `${basePath()}/filters/_stats`,
      method: 'GET',
    });
  },

  addFilter(filterId: string, description: string, items: string[]) {
    const body = JSON.stringify({
      filterId,
      description,
      items,
    });
    return http<Filter>({
      path: `${basePath()}/filters`,
      method: 'PUT',
      body,
    });
  },

  updateFilter(filterId: string, description: string, addItems: string[], removeItems: string[]) {
    const body = JSON.stringify({
      ...(description !== undefined ? { description } : {}),
      ...(addItems !== undefined ? { addItems } : {}),
      ...(removeItems !== undefined ? { removeItems } : {}),
    });

    return http<Filter>({
      path: `${basePath()}/filters/${filterId}`,
      method: 'PUT',
      body,
    });
  },

  deleteFilter(filterId: string) {
    return http<{ acknowledged: boolean }>({
      path: `${basePath()}/filters/${filterId}`,
      method: 'DELETE',
    });
  },
};
