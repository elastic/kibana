/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncResourceState } from '../../../../../state';
import { TrustedAppsListData } from '../../../../trusted_apps/state';
import { PostTrustedAppCreateResponse } from '../../../../../../../common/endpoint/types';
export interface PolicyArtifactsAvailableListPageDataChanged {
  type: 'policyArtifactsAvailableListPageDataChanged';
  payload: AsyncResourceState<TrustedAppsListData>;
}

export interface PolicyArtifactsUpdateTrustedApps {
  type: 'policyArtifactsUpdateTrustedApps';
  payload: {
    trustedAppIds: string[];
  };
}

export interface PolicyArtifactsUpdateTrustedAppsChanged {
  type: 'policyArtifactsUpdateTrustedAppsChanged';
  payload: AsyncResourceState<PostTrustedAppCreateResponse[]>;
}

export type PolicyDetailsAction =
  | PolicyArtifactsAvailableListPageDataChanged
  | PolicyArtifactsUpdateTrustedApps
  | PolicyArtifactsUpdateTrustedAppsChanged;
