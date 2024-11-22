/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import type { GetInfoResponse } from '@kbn/fleet-plugin/common';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import type {
  AppLocation,
  EndpointPendingActions,
  EndpointSortableField,
  HostInfo,
  Immutable,
  PolicyData,
  ResponseActionApiResponse,
} from '../../../../common/endpoint/types';
import type { ServerApiError } from '../../../common/types';
import type { AsyncResourceState } from '../../state';
import { TRANSFORM_STATES } from '../../../../common/constants';

export interface EndpointState {
  /** list of host **/
  hosts: HostInfo[];
  /** number of items per page */
  pageSize: number;
  /** which page to show */
  pageIndex: number;
  /** field used for sorting */
  sortField: EndpointSortableField;
  /** direction of sorting */
  sortDirection: 'asc' | 'desc';
  /** total number of hosts returned */
  total: number;
  /** list page is retrieving data */
  loading: boolean;
  /** api error from retrieving host list */
  error?: ServerApiError;
  /** current location info */
  location?: Immutable<AppLocation>;
  /** policies */
  policyItems: PolicyData[];
  /** policies are loading */
  policyItemsLoading: boolean;
  /** the selected policy ID in the onboarding flow */
  selectedPolicyId?: string;
  /** Endpoint package info */
  endpointPackageInfo: AsyncResourceState<GetInfoResponse['item']>;
  /** Tracks the list of policy IDs used in Host metadata that may no longer exist */
  nonExistingPolicies: NonExistingPolicies;
  /** Tracks whether hosts exist and helps control if onboarding should be visible */
  endpointsExist: boolean;
  /** index patterns for query bar */
  patterns: DataViewBase[];
  /** api error from retrieving index patters for query bar */
  patternsError?: ServerApiError;
  /** Is auto-refresh enabled? */
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
  /** Host isolation request state for a single endpoint */
  isolationRequestState: AsyncResourceState<ResponseActionApiResponse>;
  // Metadata transform stats to checking transform state
  metadataTransformStats: AsyncResourceState<TransformStats[]>;
  isInitialized: boolean;
}

export type AgentIdsPendingActions = Map<string, EndpointPendingActions['pending_actions']>;

/**
 * Set containing Package Policy IDs which are used but do not exist anymore
 */
export type NonExistingPolicies = Set<string>;

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
  /** Field used for sorting */
  sort_field?: EndpointSortableField;
  /** Direction of sorting */
  sort_direction?: 'asc' | 'desc';
  /** show the policy response or host details */
  show?: 'policy_response' | 'activity_log' | 'details' | 'isolate' | 'unisolate';
  /** Query text from search bar*/
  admin_query?: string;
}

const transformStates = Object.values(TRANSFORM_STATES);
export type TransformState = (typeof transformStates)[number];

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

export interface EndpointInsightRouteState {
  insight?: {
    back_url: string;
    item: CreateExceptionListItemSchema;
  };
}
