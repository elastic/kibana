/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseRequestConfig, useRequest as _useRequest } from '../../shared_imports';

import { useAppDependencies } from '../app_dependencies';

export const useRequest = (config: UseRequestConfig) => {
  const { http } = useAppDependencies();
  return _useRequest(http, config);
};
