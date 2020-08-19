/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

export const fetchTags = async (): Promise<string[]> => await apiService.get(API_URLS.MONITOR_TAGS);
