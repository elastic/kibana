/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { RootComponent } from './app';
import { AppDependencies } from '../types';

import { apiService } from './lib/api';
import { breadcrumbService } from './lib/breadcrumbs';

export function mountManagementSection(
  params: ManagementAppMountParams,
  dependencies: AppDependencies
) {
  const { element, setBreadcrumbs } = params;

  apiService.setup(dependencies.services.core.http);
  breadcrumbService.setup(setBreadcrumbs);

  render(<RootComponent {...dependencies} />, element);

  return () => {
    unmountComponentAtNode(element);
  };
}
