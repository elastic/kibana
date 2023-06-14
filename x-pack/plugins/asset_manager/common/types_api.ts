/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const assetTypeRT = rt.union([
  rt.literal('k8s.pod'),
  rt.literal('k8s.cluster'),
  rt.literal('k8s.node'),
]);

export type AssetType = rt.TypeOf<typeof assetTypeRT>;

export const assetKindRT = rt.union([
  rt.literal('cluster'),
  rt.literal('host'),
  rt.literal('pod'),
  rt.literal('container'),
  rt.literal('service'),
  rt.literal('alert'),
]);

export type AssetKind = rt.TypeOf<typeof assetKindRT>;

export type AssetStatus =
  | 'CREATING'
  | 'ACTIVE'
  | 'DELETING'
  | 'FAILED'
  | 'UPDATING'
  | 'PENDING'
  | 'UNKNOWN';
export type CloudProviderName = 'aws' | 'gcp' | 'azure' | 'other' | 'unknown' | 'none';

interface WithTimestamp {
  '@timestamp': string;
}
export interface ECSDocument extends WithTimestamp {
  'kubernetes.namespace'?: string;
  'kubernetes.pod.name'?: string;
  'kubernetes.pod.uid'?: string;
  'kubernetes.pod.start_time'?: Date;
  'kubernetes.node.name'?: string;
  'kubernetes.node.start_time'?: Date;

  'orchestrator.api_version'?: string;
  'orchestrator.namespace'?: string;
  'orchestrator.organization'?: string;
  'orchestrator.type'?: string;
  'orchestrator.cluster.id'?: string;
  'orchestrator.cluster.name'?: string;
  'orchestrator.cluster.url'?: string;
  'orchestrator.cluster.version'?: string;

  'cloud.provider'?: CloudProviderName;
  'cloud.instance.id'?: string;
  'cloud.region'?: string;
  'cloud.service.name'?: string;

  'service.environment'?: string;
}

export interface Asset extends ECSDocument {
  'asset.collection_version'?: string;
  'asset.ean': string;
  'asset.id': string;
  'asset.kind': AssetKind;
  'asset.name'?: string;
  'asset.type'?: AssetType;
  'asset.status'?: AssetStatus;
  'asset.parents'?: string | string[];
  'asset.children'?: string | string[];
  'asset.references'?: string | string[];
  'asset.namespace'?: string;
}

export type AssetWithoutTimestamp = Omit<Asset, '@timestamp'>;

export interface K8sPod extends WithTimestamp {
  id: string;
  name?: string;
  ean: string;
  node?: string;
  cloud?: {
    provider?: CloudProviderName;
    region?: string;
  };
}

export interface K8sNodeMetricBucket {
  timestamp: number;
  date?: string;
  averageMemoryAvailable: number | null;
  averageMemoryUsage: number | null;
  maxMemoryUsage: number | null;
  averageCpuCoreNs: number | null;
  maxCpuCoreNs: number | null;
}

export interface K8sNodeLog {
  timestamp: number;
  message: string;
}

export interface K8sNode extends WithTimestamp {
  id: string;
  name?: string;
  ean: string;
  pods?: K8sPod[];
  cluster?: K8sCluster;
  cloud?: {
    provider?: CloudProviderName;
    region?: string;
  };
  metrics?: K8sNodeMetricBucket[];
  logs?: K8sNodeLog[];
}

export interface K8sCluster extends WithTimestamp {
  name?: string;
  nodes?: K8sNode[];
  ean: string;
  status?: AssetStatus;
  version?: string;
  cloud?: {
    provider?: CloudProviderName;
    region?: string;
  };
}

export interface AssetFilters {
  type?: AssetType | AssetType[];
  kind?: AssetKind | AssetKind[];
  ean?: string | string[];
  id?: string;
  typeLike?: string;
  kindLike?: string;
  eanLike?: string;
  collectionVersion?: number | 'latest' | 'all';
  from?: string | number;
  to?: string | number;
}

export const relationRT = rt.union([
  rt.literal('ancestors'),
  rt.literal('descendants'),
  rt.literal('references'),
]);

export type Relation = rt.TypeOf<typeof relationRT>;
export type RelationField = keyof Pick<
  Asset,
  'asset.children' | 'asset.parents' | 'asset.references'
>;
