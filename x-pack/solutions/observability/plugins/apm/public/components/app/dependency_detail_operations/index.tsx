/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useDependencyDetailOperationsBreadcrumb } from '../../../hooks/use_dependency_detail_operations_breadcrumb';
import { DependencyDetailOperationsList } from './dependency_detail_operations_list';

export function DependencyDetailOperations() {
  useDependencyDetailOperationsBreadcrumb();

  return <DependencyDetailOperationsList />;
}
