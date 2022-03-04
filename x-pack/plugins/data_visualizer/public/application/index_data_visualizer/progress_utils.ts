/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStatsFetchProgress } from '../../../common/types/field_stats';

export const getInitialProgress = (): DataStatsFetchProgress => ({
  isRunning: false,
  loaded: 0,
  total: 100,
});

export const getReducer =
  <T>() =>
  (prev: T, update: Partial<T>): T => ({
    ...prev,
    ...update,
  });
