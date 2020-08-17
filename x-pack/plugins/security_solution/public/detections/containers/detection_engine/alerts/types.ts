/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';

export interface BasicSignals {
  signal: AbortSignal;
}
export interface QueryAlerts extends BasicSignals {
  query: object;
}

export interface AlertsResponse {
  took: number;
  timeout: boolean;
}

export interface AlertSearchResponse<Hit = {}, Aggregations = {} | undefined>
  extends AlertsResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface UpdateAlertStatusProps {
  query: object;
  status: Status;
  signal?: AbortSignal; // TODO: implement cancelling
}

export interface AlertsIndex {
  name: string;
}

export interface Privilege {
  username: string;
  has_all_requested: boolean;
  cluster: {
    monitor_ml: boolean;
    manage_ccr: boolean;
    manage_index_templates: boolean;
    monitor_watcher: boolean;
    monitor_transform: boolean;
    read_ilm: boolean;
    manage_security: boolean;
    manage_own_api_key: boolean;
    manage_saml: boolean;
    all: boolean;
    manage_ilm: boolean;
    manage_ingest_pipelines: boolean;
    read_ccr: boolean;
    manage_rollup: boolean;
    monitor: boolean;
    manage_watcher: boolean;
    manage: boolean;
    manage_transform: boolean;
    manage_token: boolean;
    manage_ml: boolean;
    manage_pipeline: boolean;
    monitor_rollup: boolean;
    transport_client: boolean;
    create_snapshot: boolean;
  };
  index: {
    [indexName: string]: {
      all: boolean;
      manage_ilm: boolean;
      read: boolean;
      create_index: boolean;
      read_cross_cluster: boolean;
      index: boolean;
      monitor: boolean;
      delete: boolean;
      manage: boolean;
      delete_index: boolean;
      create_doc: boolean;
      view_index_metadata: boolean;
      create: boolean;
      manage_follow_index: boolean;
      manage_leader_index: boolean;
      write: boolean;
    };
  };
  is_authenticated: boolean;
  has_encryption_key: boolean;
}
