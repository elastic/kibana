/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BreadcrumbService } from './breadcrumbs';

export const createBreadcrumbsMock = () => {
  const breadcrumbService = new BreadcrumbService();
  breadcrumbService.setup(jest.fn());
  return breadcrumbService;
};
