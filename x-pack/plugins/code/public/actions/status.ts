/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { RepoStatus } from '../reducers';

export const loadStatus = createAction<string>('LOAD STATUS');
export const loadStatusSuccess = createAction<any>('LOAD STATUS SUCCESS');
export const loadStatusFailed = createAction<string>('LOAD STATUS FAILED');

export const pollRepoCloneStatus = createAction<any>('POLL CLONE STATUS');
export const pollRepoIndexStatus = createAction<any>('POLL INDEX STATUS');
export const pollRepoDeleteStatus = createAction<any>('POLL DELETE STATUS');

export const loadRepo = createAction<string>('LOAD REPO');
export const loadRepoSuccess = createAction<any>('LOAD REPO SUCCESS');
export const loadRepoFailed = createAction<any>('LOAD REPO FAILED');

export const updateCloneProgress = createAction<RepoStatus>('UPDATE CLONE PROGRESS');
export const updateIndexProgress = createAction<RepoStatus>('UPDATE INDEX PROGRESS');
export const updateDeleteProgress = createAction<RepoStatus>('UPDATE DELETE PROGRESS');
