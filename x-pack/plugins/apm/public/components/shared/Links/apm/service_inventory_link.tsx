/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMQueryParams } from '../url_helpers';
import { useAPMHref } from './APMLink';

const persistedFilters: Array<keyof APMQueryParams> = ['host', 'agentName'];

export function useServiceInventoryHref() {
  return useAPMHref({ path: '/services', persistedFilters });
}
