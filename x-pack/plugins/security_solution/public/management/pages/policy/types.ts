/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { ILicense } from '../../../../../licensing/common/types';
import {
  AppLocation,
  Immutable,
  ProtectionFields,
  PolicyData,
  UIPolicyConfig,
  PostTrustedAppCreateResponse,
  MaybeImmutable,
  GetTrustedAppsListResponse,
  TrustedApp,
  PutTrustedAppUpdateResponse,
} from '../../../../common/endpoint/types';
import { ServerApiError } from '../../../common/types';
import {
  GetAgentStatusResponse,
  GetOnePackagePolicyResponse,
  GetPackagePoliciesResponse,
  UpdatePackagePolicyResponse,
} from '../../../../../fleet/common';
import { AsyncResourceState } from '../../state';
import { ImmutableMiddlewareAPI } from '../../../common/store';
import { AppAction } from '../../../common/store/actions';
import { TrustedAppsService } from '../trusted_apps/service';

export type PolicyDetailsStore = ImmutableMiddlewareAPI<PolicyDetailsState, AppAction>;

/**
 * Function that runs Policy Details middleware
 */
export type MiddlewareRunner = (
  context: MiddlewareRunnerContext,
  store: PolicyDetailsStore,
  action: MaybeImmutable<AppAction>
) => Promise<void>;

export interface MiddlewareRunnerContext {
  coreStart: CoreStart;
  trustedAppsService: TrustedAppsService;
}

export type PolicyDetailsSelector<T = unknown> = (
  state: Immutable<PolicyDetailsState>
) => Immutable<T>;

/**
 * Policy details store state
 */
export interface PolicyDetailsState {
  /** A single policy item  */
  policyItem?: PolicyData;
  /** API error if loading data failed */
  apiError?: ServerApiError;
  isLoading: boolean;
  /** current location of the application */
  location?: Immutable<AppLocation>;
  /** artifacts namespace inside policy details page */
  artifacts: PolicyArtifactsState;
  /** A summary of stats for the agents associated with a given Fleet Agent Policy */
  agentStatusSummary?: Omit<GetAgentStatusResponse['results'], 'updating'>;
  /** Status of an update to the policy  */
  updateStatus?: {
    success: boolean;
    error?: ServerApiError;
  };
  /** current license */
  license?: ILicense;
}

export interface PolicyAssignedTrustedApps {
  location: PolicyDetailsArtifactsPageListLocationParams;
  artifacts: GetTrustedAppsListResponse;
}

export interface PolicyRemoveTrustedApps {
  artifacts: TrustedApp[];
  response: PutTrustedAppUpdateResponse[];
}

/**
 * Policy artifacts store state
 */
export interface PolicyArtifactsState {
  /** artifacts location params  */
  location: PolicyDetailsArtifactsPageLocation;
  /** A list of artifacts can be linked to the policy  */
  assignableList: AsyncResourceState<GetTrustedAppsListResponse>;
  /** Represents if available trusted apps entries exist, regardless of whether the list is showing results  */
  assignableListEntriesExist: AsyncResourceState<boolean>;
  /** A list of trusted apps going to be updated  */
  trustedAppsToUpdate: AsyncResourceState<PostTrustedAppCreateResponse[]>;
  /** Represents if there is any trusted app existing  */
  doesAnyTrustedAppExists: AsyncResourceState<GetTrustedAppsListResponse>;
  /** Represents if there is any trusted app existing assigned to the policy (without filters)  */
  hasTrustedApps: AsyncResourceState<GetTrustedAppsListResponse>;
  /** List of artifacts currently assigned to the policy (body specific and global) */
  assignedList: AsyncResourceState<PolicyAssignedTrustedApps>;
  /** A list of all available polices */
  policies: AsyncResourceState<GetPolicyListResponse>;
  /** list of artifacts to remove. Holds the ids that were removed and the API response */
  removeList: AsyncResourceState<PolicyRemoveTrustedApps>;
}

export enum OS {
  windows = 'windows',
  mac = 'mac',
  linux = 'linux',
}

export interface PolicyDetailsArtifactsPageListLocationParams {
  page_index: number;
  page_size: number;
  filter: string;
}

export interface PolicyDetailsArtifactsPageLocation
  extends PolicyDetailsArtifactsPageListLocationParams {
  show?: 'list';
}

/**
 * Returns the keys of an object whose values meet a criteria.
 *  Ex) interface largeNestedObject = {
 *         a: {
 *           food: Foods;
 *           toiletPaper: true;
 *         };
 *         b: {
 *           food: Foods;
 *           streamingServices: Streams;
 *         };
 *         c: {};
 *    }
 *
 *    type hasFoods = KeysByValueCriteria<largeNestedObject, { food: Foods }>;
 *    The above type will be: [a, b] only, and will not include c.
 *
 */
export type KeysByValueCriteria<O, Criteria> = {
  [K in keyof O]: O[K] extends Criteria ? K : never;
}[keyof O];

/** Returns an array of the policy OSes that have a malware protection field */
export type MalwareProtectionOSes = KeysByValueCriteria<
  UIPolicyConfig,
  { malware: ProtectionFields }
>;

/** Returns an array of the policy OSes that have a memory protection field */
export type MemoryProtectionOSes = KeysByValueCriteria<
  UIPolicyConfig,
  { memory_protection: ProtectionFields }
>;

/** Returns an array of the policy OSes that have a behavior protection field */
export type BehaviorProtectionOSes = KeysByValueCriteria<
  UIPolicyConfig,
  { behavior_protection: ProtectionFields }
>;

/** Returns an array of the policy OSes that have a ransomware protection field */
export type RansomwareProtectionOSes = KeysByValueCriteria<
  UIPolicyConfig,
  { ransomware: ProtectionFields }
>;

export type PolicyProtection =
  | keyof Pick<
      UIPolicyConfig['windows'],
      'malware' | 'ransomware' | 'memory_protection' | 'behavior_protection'
    >
  | keyof Pick<UIPolicyConfig['mac'], 'malware' | 'behavior_protection' | 'memory_protection'>
  | keyof Pick<UIPolicyConfig['linux'], 'malware' | 'behavior_protection' | 'memory_protection'>;

export type MacPolicyProtection = keyof Pick<UIPolicyConfig['mac'], 'malware'>;

export type LinuxPolicyProtection = keyof Pick<UIPolicyConfig['linux'], 'malware'>;

export interface GetPolicyListResponse extends GetPackagePoliciesResponse {
  items: PolicyData[];
}

export interface GetPolicyResponse extends GetOnePackagePolicyResponse {
  item: PolicyData;
}

export interface UpdatePolicyResponse extends UpdatePackagePolicyResponse {
  item: PolicyData;
}
