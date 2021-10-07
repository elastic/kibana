/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action } from 'redux';
import { AsyncResourceState } from '../../../../../state';
import {
  PostTrustedAppCreateResponse,
  GetTrustedAppsListResponse,
} from '../../../../../../../common/endpoint/types';
import { PolicyArtifactsState } from '../../../types';

export interface PolicyArtifactsAssignableListPageDataChanged {
  type: 'policyArtifactsAssignableListPageDataChanged';
  payload: AsyncResourceState<GetTrustedAppsListResponse>;
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

export interface PolicyArtifactsDeosAnyTrustedAppExists {
  type: 'policyArtifactsDeosAnyTrustedAppExists';
  payload: AsyncResourceState<boolean>;
}

export interface AssignedTrustedAppsListStateChanged
  extends Action<'assignedTrustedAppsListStateChanged'> {
  payload: PolicyArtifactsState['assignedList'];
}

export interface PolicyDetailsListOfAllPoliciesStateChanged
  extends Action<'policyDetailsListOfAllPoliciesStateChanged'> {
  payload: PolicyArtifactsState['policies'];
}

export type PolicyDetailsTrustedAppsForceListDataRefresh =
  Action<'policyDetailsTrustedAppsForceListDataRefresh'>;

/**
 * All of the possible actions for Trusted Apps under the Policy Details store
 */
export type PolicyTrustedAppsAction =
  | PolicyArtifactsAssignableListPageDataChanged
  | PolicyArtifactsUpdateTrustedApps
  | PolicyArtifactsUpdateTrustedAppsChanged
  | PolicyArtifactsAssignableListExistDataChanged
  | PolicyArtifactsAssignableListPageDataFilter
  | PolicyArtifactsDeosAnyTrustedAppExists
  | AssignedTrustedAppsListStateChanged
  | PolicyDetailsListOfAllPoliciesStateChanged
  | PolicyDetailsTrustedAppsForceListDataRefresh;
