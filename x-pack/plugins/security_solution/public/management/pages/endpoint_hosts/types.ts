/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import { GetPackagesResponse } from '@kbn/fleet-plugin/common';
import {
  ActivityLog,
  HostInfo,
  Immutable,
  HostMetadata,
  HostPolicyResponse,
  AppLocation,
  PolicyData,
  HostStatus,
  HostIsolationResponse,
  EndpointPendingActions,
} from '../../../../common/endpoint/types';
import { ServerApiError } from '../../../common/types';
import { AsyncResourceState } from '../../state';
import { TRANSFORM_STATES } from '../../../../common/constants';

export interface EndpointState {
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
  endpointDetails: {
    activityLog: {
      paging: {
        disabled?: boolean;
        page: number;
        pageSize: number;
        startDate: string;
        endDate: string;
        isInvalidDateRange: boolean;
        autoRefreshOptions: {
          enabled: boolean;
          duration: number;
        };
        recentlyUsedDateRanges: EuiSuperDatePickerRecentRange[];
      };
      logData: AsyncResourceState<ActivityLog>;
    };
    hostDetails: {
      /** details data for a specific host */
      details?: Immutable<HostMetadata>;
      /** details page is retrieving data */
      detailsLoading: boolean;
      /** api error from retrieving host details */
      detailsError?: ServerApiError;
    };
  };
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
  endpointPackageInfo: AsyncResourceState<GetPackagesResponse['items'][0]>;
  /** Tracks the list of policies IDs used in Host metadata that may no longer exist */
  nonExistingPolicies: PolicyIds['packagePolicy'];
  /** List of Package Policy Ids mapped to an associated Fleet Parent Agent Policy Id*/
  agentPolicies: PolicyIds['agentPolicy'];
  /** Tracks whether hosts exist and helps control if onboarding should be visible */
  endpointsExist: boolean;
  /** index patterns for query bar */
  patterns: DataViewBase[];
  /** api error from retrieving index patters for query bar */
  patternsError?: ServerApiError;
  /** Is auto-refresh enabled */
  isAutoRefreshEnabled: boolean;
  /** The current auto refresh interval for data in ms */
  autoRefreshInterval: number;
  /** The total Agents that contain an Endpoint package */
  agentsWithEndpointsTotal: number;
  /** api error for total Agents that contain an Endpoint package */
  agentsWithEndpointsTotalError?: ServerApiError;
  /** The total, actual number of Endpoints regardless of any filtering */
  endpointsTotal: number;
  /** api error for total, actual Endpoints */
  endpointsTotalError?: ServerApiError;
  /** The policy IDs and revision number of the corresponding agent, and endpoint. May be more recent than what's running */
  policyVersionInfo?: HostInfo['policy_info'];
  /** The status of the host, which is mapped to the Elastic Agent status in Fleet */
  hostStatus?: HostStatus;
  /** Host isolation request state for a single endpoint */
  isolationRequestState: AsyncResourceState<HostIsolationResponse>;
  /**
   * Holds a map of `agentId` to `EndpointPendingActions` that is used by both the list and details view
   * Getting pending endpoint actions is "supplemental" data, so there is no need to show other Async
   * states other than Loaded
   */
  endpointPendingActions: AsyncResourceState<AgentIdsPendingActions>;
  // Metadata transform stats to checking transform state
  metadataTransformStats: AsyncResourceState<TransformStats[]>;
}

export type AgentIdsPendingActions = Map<string, EndpointPendingActions['pending_actions']>;

/**
 * packagePolicy contains a list of Package Policy IDs (received via Endpoint metadata policy response) mapped to a boolean whether they exist or not.
 * agentPolicy contains a list of existing Package Policy Ids mapped to an associated Fleet parent Agent Config.
 */
export interface PolicyIds {
  packagePolicy: Record<string, boolean>;
  agentPolicy: Record<string, string>;
}

/**
 * Query params on the host page parsed from the URL
 */
export interface EndpointIndexUIQueryParams {
  /** Selected endpoint id shows host details flyout */
  selected_endpoint?: string;
  /** How many items to show in list */
  page_size?: string;
  /** Which page to show */
  page_index?: string;
  /** show the policy response or host details */
  show?: 'policy_response' | 'activity_log' | 'details' | 'isolate' | 'unisolate';
  /** Query text from search bar*/
  admin_query?: string;
}

const transformStates = Object.values(TRANSFORM_STATES);
export type TransformState = typeof transformStates[number];

export interface TransformStats {
  id: string;
  checkpointing: {
    last: {
      checkpoint: number;
      timestamp_millis?: number;
    };
    next?: {
      checkpoint: number;
      checkpoint_progress?: {
        total_docs: number;
        docs_remaining: number;
        percent_complete: number;
      };
    };
    operations_behind: number;
  };
  node?: {
    id: string;
    name: string;
    ephemeral_id: string;
    transport_address: string;
    attributes: Record<string, unknown>;
  };
  stats: {
    delete_time_in_ms: number;
    documents_deleted: number;
    documents_indexed: number;
    documents_processed: number;
    index_failures: number;
    index_time_in_ms: number;
    index_total: number;
    pages_processed: number;
    search_failures: number;
    search_time_in_ms: number;
    search_total: number;
    trigger_count: number;
    processing_time_in_ms: number;
    processing_total: number;
    exponential_avg_checkpoint_duration_ms: number;
    exponential_avg_documents_indexed: number;
    exponential_avg_documents_processed: number;
  };
  reason?: string;
  state: TransformState;
}

export interface TransformStatsResponse {
  count: number;
  transforms: TransformStats[];
}
