/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HostInfo,
  Immutable,
  HostMetadata,
  HostPolicyResponse,
  AppLocation,
  PolicyData,
} from '../../../../common/endpoint/types';
import { ServerApiError } from '../../../common/types';
import { GetPackagesResponse } from '../../../../../ingest_manager/common';

export interface HostState {
  /** list of host **/
  hosts: HostInfo[];
  /** number of items per page */
  pageSize: number;
  /** which page to show */
  pageIndex: number;
  /** total number of hosts returned */
  total: number;
  /** list page is retrieving data */
  loading: boolean;
  /** api error from retrieving host list */
  error?: ServerApiError;
  /** details data for a specific host */
  details?: Immutable<HostMetadata>;
  /** details page is retrieving data */
  detailsLoading: boolean;
  /** api error from retrieving host details */
  detailsError?: ServerApiError;
  /** Holds the Policy Response for the Host currently being displayed in the details */
  policyResponse?: HostPolicyResponse;
  /** policyResponse is being retrieved */
  policyResponseLoading: boolean;
  /** api error from retrieving the policy response */
  policyResponseError?: ServerApiError;
  /** current location info */
  location?: Immutable<AppLocation>;
  /** policies */
  policyItems: PolicyData[];
  /** policies are loading */
  policyItemsLoading: boolean;
  /** the selected policy ID in the onboarding flow */
  selectedPolicyId?: string;
  /** Endpoint package info */
  endpointPackageInfo?: GetPackagesResponse['response'][0];
}

/**
 * Query params on the host page parsed from the URL
 */
export interface HostIndexUIQueryParams {
  /** Selected host id shows host details flyout */
  selected_host?: string;
  /** How many items to show in list */
  page_size?: string;
  /** Which page to show */
  page_index?: string;
  /** show the policy response or host details */
  show?: 'policy_response' | 'details';
}
