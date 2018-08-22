/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loadEntriesActionCreators } from './operations/load';
import { loadMoreEntriesActionCreators } from './operations/load_more';

export const loadEntries = loadEntriesActionCreators.resolve;
export const loadMoreEntries = loadMoreEntriesActionCreators.resolve;
