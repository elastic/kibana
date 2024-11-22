/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchIndices, SearchStart } from '@kbn/deeplinks-search/deep_links';

export const PLUGIN_ID = 'searchIndices';
export const PLUGIN_NAME = 'searchIndices';
export const START_APP_ID: SearchStart = 'elasticsearchStart';
export const INDICES_APP_ID: SearchIndices = 'elasticsearchIndices';

export type { IndicesStatusResponse, UserStartPrivilegesResponse } from './types';
