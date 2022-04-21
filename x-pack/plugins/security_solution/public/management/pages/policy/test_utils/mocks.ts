/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OperatingSystem } from '@kbn/securitysolution-utils';
import { GetTrustedAppsListResponse, TrustedApp } from '../../../../../common/endpoint/types';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../common/constants';

interface Pagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
}

const OPERATING_SYSTEMS: OperatingSystem[] = [
  OperatingSystem.WINDOWS,
  OperatingSystem.MAC,
  OperatingSystem.LINUX,
];

const generate = <T>(count: number, generator: (i: number) => T) =>
  [...new Array(count).keys()].map(generator);

const createSampleTrustedApp = (i: number, longTexts?: boolean): TrustedApp => {
  return {
    id: String(i),
    version: 'abc123',
    name: generate(longTexts ? 10 : 1, () => `trusted app ${i}`).join(' '),
    description: generate(longTexts ? 10 : 1, () => `Trusted App ${i}`).join(' '),
    created_at: '1 minute ago',
    created_by: 'someone',
    updated_at: '1 minute ago',
    updated_by: 'someone',
    os: OPERATING_SYSTEMS[i % 3],
    entries: [],
    effectScope: { type: 'global' },
  };
};

const createDefaultPagination = (): Pagination => ({
  pageIndex: MANAGEMENT_DEFAULT_PAGE,
  pageSize: MANAGEMENT_DEFAULT_PAGE_SIZE,
  totalItemCount: 200,
  pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
});

const createSampleTrustedApps = (
  pagination: Partial<Pagination>,
  longTexts?: boolean
): TrustedApp[] => {
  const fullPagination = { ...createDefaultPagination(), ...pagination };

  return generate(fullPagination.pageSize, (i: number) => createSampleTrustedApp(i, longTexts));
};

export const getMockListResponse: () => GetTrustedAppsListResponse = () => ({
  data: createSampleTrustedApps({}),
  per_page: 100,
  page: 1,
  total: 100,
});
