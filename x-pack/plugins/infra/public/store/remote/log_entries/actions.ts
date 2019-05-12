/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { loadEntriesActionCreators } from './operations/load';
import { loadMoreEntriesActionCreators } from './operations/load_more';

const actionCreator = actionCreatorFactory('x-pack/infra/remote/log_entries');

export const setSourceId = actionCreator<string>('SET_SOURCE_ID');

export const loadEntries = loadEntriesActionCreators.resolve;
export const loadMoreEntries = loadMoreEntriesActionCreators.resolve;

export const loadNewerEntries = actionCreator('LOAD_NEWER_LOG_ENTRIES');

export const reloadEntries = actionCreator('RELOAD_LOG_ENTRIES');
