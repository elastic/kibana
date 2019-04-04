/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export * from './clusters';
export * from './date';
export * from './breadcrumbs';

export const refreshActiveRouteData = createAction('refreshActiveRouteData', location => ({ location }));
