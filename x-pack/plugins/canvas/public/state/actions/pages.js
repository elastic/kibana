/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const addPage = createAction('addPage');
export const duplicatePage = createAction('duplicatePage');
export const movePage = createAction('movePage', (id, position) => ({ id, position }));
export const removePage = createAction('removePage');
export const stylePage = createAction('stylePage', (pageId, style) => ({ pageId, style }));
export const setPage = createAction('setPage');
export const setPageTransition = createAction('setPageTransition', (pageId, transition) => ({
  pageId,
  transition,
}));
