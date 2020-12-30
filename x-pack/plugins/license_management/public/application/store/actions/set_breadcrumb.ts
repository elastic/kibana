/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ThunkAction } from 'redux-thunk';
import { BreadcrumbService } from '../../breadcrumbs';

export const setBreadcrumb = (
  section: 'dashboard' | 'upload'
): ThunkAction<any, any, { breadcrumbService: BreadcrumbService }, any> => (
  dispatch,
  getState,
  { breadcrumbService }
) => {
  breadcrumbService.setBreadcrumbs(section);
};
