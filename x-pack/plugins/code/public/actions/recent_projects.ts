/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const loadRecentProjects = createAction('LOAD RECENT PROJECTS');
export const loadRecentProjectsSuccess = createAction<any>('LOAD RECENT PROJECTS SUCCESS');
export const loadRecentProjectsFailed = createAction<Error>('LOAD RECENT PROJECTS FAILED');
