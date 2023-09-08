/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../../common/constants';
import { StatesIndexStatus, StatesIndexStatusType } from '../../../../common/runtime_types';
import { apiService } from './utils';

let indexStatusPromise: Promise<{ indexExists: boolean; indices: string }> | null = null;

export const fetchIndexStatus = async (from?: string, to?: string): Promise<StatesIndexStatus> => {
  if (indexStatusPromise) {
    return indexStatusPromise;
  }
  indexStatusPromise = apiService.get(API_URLS.INDEX_STATUS, { from, to }, StatesIndexStatusType);
  indexStatusPromise.then(
    () => {
      indexStatusPromise = null;
    },
    () => {
      indexStatusPromise = null;
    }
  );
  return indexStatusPromise;
};
