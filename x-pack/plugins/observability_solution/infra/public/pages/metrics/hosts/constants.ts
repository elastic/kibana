/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostLimitOptions } from './types';

export const DEFAULT_HOST_LIMIT: HostLimitOptions = 100;
export const DEFAULT_PAGE_SIZE = 10;
export const LOCAL_STORAGE_HOST_LIMIT_KEY = 'hostsView:hostLimitSelection';
export const LOCAL_STORAGE_PAGE_SIZE_KEY = 'hostsView:pageSizeSelection';

export const PAGE_SIZE_OPTIONS = [5, 10, 20];

export const HOST_LIMIT_OPTIONS = [50, 100, 500] as const;
export const HOST_METRICS_DOC_HREF = 'https://ela.st/docs-infra-host-metrics';
