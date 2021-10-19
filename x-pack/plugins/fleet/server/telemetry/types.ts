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

export interface TelemetryEvent {
  [key: string]: SearchTypes;
  cluster_name?: string;
  cluster_uuid?: string;
}
