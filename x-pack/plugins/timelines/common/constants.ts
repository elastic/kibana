/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertStatus } from './types/timeline/actions';

export const DEFAULT_MAX_TABLE_QUERY_SIZE = 10000;
export const DEFAULT_NUMBER_FORMAT = 'format:number:defaultPattern';

export const FILTER_OPEN: AlertStatus = 'open';
export const FILTER_CLOSED: AlertStatus = 'closed';
export const FILTER_IN_PROGRESS: AlertStatus = 'in-progress';

export const RAC_ALERTS_BULK_UPDATE_URL = '/internal/rac/alerts/bulk_update';
