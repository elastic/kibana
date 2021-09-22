/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyDetailsState } from '../../../types';
import { GetTrustedAppsListResponse } from '../../../../../../../common/endpoint/types';

export const isOnTrustedAppsArtifactsView = (state: PolicyDetailsState): boolean => {
  return true;
};

export const doesPolicyHaveTrustedApps = (
  state: PolicyDetailsState
): { loading: boolean; hasTrustedApps: boolean } => {
  // TODO: implement empty state (task #1645)
  return {
    loading: false,
    hasTrustedApps: true,
  };
};

export const isPolicyTrustedAppListLoading = (): boolean => {
  return false;
};

export const getPolicyTrustedAppList = (): GetTrustedAppsListResponse => {
  return {
    data: [],
    page: 1,
    total: 100,
    per_page: 20,
  };
};
