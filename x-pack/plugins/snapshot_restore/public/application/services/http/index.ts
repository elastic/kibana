/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UiMetricService } from '../ui_metric';
import { setUiMetricServicePolicy } from './policy_requests';
import { setUiMetricServiceRepository } from './repository_requests';
import { setUiMetricServiceRestore } from './restore_requests';
import { setUiMetricServiceSnapshot } from './snapshot_requests';

export { HttpService, httpService } from './http';
export * from './repository_requests';
export * from './snapshot_requests';
export * from './restore_requests';
export * from './policy_requests';

export const setUiMetricService = (uiMetricService: UiMetricService) => {
  setUiMetricServicePolicy(uiMetricService);
  setUiMetricServiceRepository(uiMetricService);
  setUiMetricServiceRestore(uiMetricService);
  setUiMetricServiceSnapshot(uiMetricService);
};
