/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export * from './repository';
export * from './search';
export * from './file';
export * from './structure';
export * from './editor';
export * from './commit';
export * from './status';
export * from './project_config';
export * from './shortcuts';

export interface Match {
  isExact?: boolean;
  params: { [key: string]: string };
  path: string;
  url: string;
  location: Location;
}

export const routeChange = createAction<Match>('CODE SEARCH ROUTE CHANGE');

export const checkSetupSuccess = createAction('SETUP CHECK SUCCESS');
export const checkSetupFailed = createAction('SETUP CHECK FAILED');
