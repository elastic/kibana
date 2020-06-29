/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PolicyData,
  Immutable,
  MalwareFields,
  UIPolicyConfig,
  AppLocation,
} from '../../../../common/endpoint/types';
import { ServerApiError } from '../../../common/types';
import {
  GetAgentStatusResponse,
  GetDatasourcesResponse,
  GetOneDatasourceResponse,
  GetPackagesResponse,
  UpdateDatasourceResponse,
} from '../../../../../ingest_manager/common';

/**
 * Policy list store state
 */
export interface PolicyListState {
  /** Array of policy items  */
  policyItems: PolicyData[];
  /** Information about the latest endpoint package */
  endpointPackageInfo?: GetPackagesResponse['response'][0];
  /** API error if loading data failed */
  apiError?: ServerApiError;
  /** total number of policies */
  total: number;
  /** Number of policies per page */
  pageSize: number;
  /** page number (zero based) */
  pageIndex: number;
  /** data is being retrieved from server */
  isLoading: boolean;
  /** current location information */
  location?: Immutable<AppLocation>;
  /** policy is being deleted */
  isDeleting: boolean;
  /** Deletion status */
  deleteStatus?: boolean;
  /** A summary of stats for the agents associated with a given Fleet Agent Configuration */
  agentStatusSummary?: GetAgentStatusResponse['results'];
}

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
  /** A summary of stats for the agents associated with a given Fleet Agent Configuration */
  agentStatusSummary?: GetAgentStatusResponse['results'];
  /** Status of an update to the policy  */
  updateStatus?: {
    success: boolean;
    error?: ServerApiError;
  };
}

/**
 * The URL search params that are supported by the Policy List page view
 */
export interface PolicyListUrlSearchParams {
  page_index: number;
  page_size: number;
}

/**
 * Endpoint Policy configuration
 */
export interface PolicyConfig {
  windows: {
    events: {
      dll_and_driver_load: boolean;
      dns: boolean;
      file: boolean;
      network: boolean;
      process: boolean;
      registry: boolean;
      security: boolean;
    };
    malware: MalwareFields;
    logging: {
      stdout: string;
      file: string;
    };
    advanced: PolicyConfigAdvancedOptions;
  };
  mac: {
    events: {
      file: boolean;
      process: boolean;
      network: boolean;
    };
    malware: MalwareFields;
    logging: {
      stdout: string;
      file: string;
    };
    advanced: PolicyConfigAdvancedOptions;
  };
  linux: {
    events: {
      file: boolean;
      process: boolean;
      network: boolean;
    };
    logging: {
      stdout: string;
      file: string;
    };
    advanced: PolicyConfigAdvancedOptions;
  };
}

interface PolicyConfigAdvancedOptions {
  elasticsearch: {
    indices: {
      control: string;
      event: string;
      logging: string;
    };
    kernel: {
      connect: boolean;
      process: boolean;
    };
  };
}

export enum OS {
  windows = 'windows',
  mac = 'mac',
  linux = 'linux',
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
export type MalwareProtectionOSes = KeysByValueCriteria<UIPolicyConfig, { malware: MalwareFields }>;

export interface GetPolicyListResponse extends GetDatasourcesResponse {
  items: PolicyData[];
}

export interface GetPolicyResponse extends GetOneDatasourceResponse {
  item: PolicyData;
}

export interface UpdatePolicyResponse extends UpdateDatasourceResponse {
  item: PolicyData;
}
