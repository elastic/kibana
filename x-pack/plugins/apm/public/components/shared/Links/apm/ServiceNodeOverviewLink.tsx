/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APMQueryParams } from '../url_helpers';
import { useAPMHref } from './APMLink';

const persistedFilters: Array<keyof APMQueryParams> = [
  'host',
  'containerId',
  'podName',
  'serviceVersion',
];

export function useServiceNodeOverviewHref(serviceName: string) {
  return useAPMHref({
    path: `/services/${serviceName}/nodes`,
    persistedFilters,
  });
}
