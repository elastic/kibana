/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const loadStatus = createAction<string>('LOAD STATUS');
export const loadStatusSuccess = createAction<any>('LOAD STATUS SUCCESS');
export const loadStatusFailed = createAction<string>('LOAD STATUS FAILED');

export const pollRepoCloneStatus = createAction<any>('POLL CLONE STATUS');
export const pollRepoIndexStatus = createAction<any>('POLL INDEX STATUS');
export const pollRepoDeleteStatus = createAction<any>('POLL DELETE STATUS');

export const loadRepo = createAction<string>('LOAD REPO');
export const loadRepoSuccess = createAction<any>('LOAD REPO SUCCESS');
export const loadRepoFailed = createAction<any>('LOAD REPO FAILED');

export interface RepoProgress {
  repoUri: string;
  progress: number;
  cloneProgress?: any;
}

export const updateCloneProgress = createAction<RepoProgress>('UPDATE CLONE PROGRESS');
export const updateIndexProgress = createAction<RepoProgress>('UPDATE INDEX PROGRESS');
export const updateDeleteProgress = createAction<RepoProgress>('UPDATE DELETE PROGRESS');
