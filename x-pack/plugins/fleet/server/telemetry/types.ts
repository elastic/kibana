/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type BaseSearchTypes = string | number | boolean | object;
export type SearchTypes = BaseSearchTypes | BaseSearchTypes[] | undefined;

// For getting cluster info. Copied from telemetry_collection/get_cluster_info.ts
export interface ESClusterInfo {
  cluster_uuid: string;
  cluster_name: string;
  version?: {
    number: string;
    build_flavor: string;
    build_type: string;
    build_hash: string;
    build_date: string;
    build_snapshot?: boolean;
    lucene_version: string;
    minimum_wire_compatibility_version: string;
    minimum_index_compatibility_version: string;
  };
}

// From https://www.elastic.co/guide/en/elasticsearch/reference/current/get-license.html
export interface ESLicense {
  status: string;
  uid: string;
  type: string;
  issue_date?: string;
  issue_date_in_millis?: number;
  expiry_date?: string;
  expirty_date_in_millis?: number;
  max_nodes?: number;
  issued_to?: string;
  issuer?: string;
  start_date_in_millis?: number;
}

export interface TelemetryEvent {
  [key: string]: SearchTypes;
  '@timestamp'?: string;
  cluster_name?: string;
  cluster_uuid?: string;
  license?: ESLicense;
}
