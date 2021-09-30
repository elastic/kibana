/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AsyncResourceState } from '../../../../../state';
import {
  PostTrustedAppCreateResponse,
  GetTrustedListAppsResponse,
} from '../../../../../../../common/endpoint/types';
export interface PolicyArtifactsAssignableListPageDataChanged {
  type: 'policyArtifactsAssignableListPageDataChanged';
  payload: AsyncResourceState<GetTrustedListAppsResponse>;
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

export interface PolicyArtifactsAssignableListExistDataChanged {
  type: 'policyArtifactsAssignableListExistDataChanged';
  payload: AsyncResourceState<boolean>;
}

export interface PolicyArtifactsAssignableListPageDataFilter {
  type: 'policyArtifactsAssignableListPageDataFilter';
  payload: { filter: string };
}

export type PolicyTrustedAppsAction =
  | PolicyArtifactsAssignableListPageDataChanged
  | PolicyArtifactsUpdateTrustedApps
  | PolicyArtifactsUpdateTrustedAppsChanged
  | PolicyArtifactsAssignableListExistDataChanged
  | PolicyArtifactsAssignableListPageDataFilter;
