/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Breadcrumb, BreadcrumbContext } from './types';

/* istanbul ignore next */
const defaultContext: BreadcrumbContext = {
  breadcrumbs: [],
  addCrumb: (crumb: Breadcrumb) => null,
  removeCrumb: (crumb: Breadcrumb) => null,
};

export const { Provider, Consumer } = React.createContext(defaultContext);
