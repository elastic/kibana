/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBackendDetailOperationsBreadcrumb } from '../../../hooks/use_backend_detail_operations_breadcrumb';
import { BackendDetailOperationsList } from './backend_detail_operations_list';

export function BackendDetailOperations() {
  useBackendDetailOperationsBreadcrumb();

  return <BackendDetailOperationsList />;
}
