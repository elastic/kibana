/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  dateRt,
  inRangeFromStringRt,
  datemathStringRt,
  createLiteralValueFromUndefinedRT,
} from '@kbn/io-ts-utils';

export const assetTypeRT = rt.keyof({
  'k8s.pod': null,
  'k8s.cluster': null,
  'k8s.node': null,
});

export type AssetType = rt.TypeOf<typeof assetTypeRT>;

export const assetKindRT = rt.keyof({
  cluster: null,
  host: null,
  pod: null,
  container: null,
  service: null,
  alert: null,
});

export type AssetKind = rt.TypeOf<typeof assetKindRT>;

export const assetStatusRT = rt.keyof({
  CREATING: null,
  ACTIVE: null,
  DELETING: null,
  FAILED: null,
  UPDATING: null,
  PENDING: null,
  UNKNOWN: null,
});

export type AssetStatus = rt.TypeOf<typeof assetStatusRT>;

// https://github.com/gcanti/io-ts/blob/master/index.md#union-of-string-literals
export const cloudProviderNameRT = rt.keyof({
  aws: null,
  gcp: null,
  azure: null,
  other: null,
  unknown: null,
  none: null,
});

export type CloudProviderName = rt.TypeOf<typeof cloudProviderNameRT>;

const withTimestampRT = rt.type({
  '@timestamp': rt.string,
});

export type WithTimestamp = rt.TypeOf<typeof withTimestampRT>;

export const ECSDocumentRT = rt.intersection([
  withTimestampRT,
  rt.partial({
    'kubernetes.namespace': rt.string,
    'kubernetes.pod.name': rt.string,
    'kubernetes.pod.uid': rt.string,
    'kubernetes.pod.start_time': rt.string,
    'kubernetes.node.name': rt.string,
    'kubernetes.node.start_time': rt.string,
    'orchestrator.api_version': rt.string,
    'orchestrator.namespace': rt.string,
    'orchestrator.organization': rt.string,
    'orchestrator.type': rt.string,
    'orchestrator.cluster.id': rt.string,
    'orchestrator.cluster.name': rt.string,
    'orchestrator.cluster.url': rt.string,
    'orchestrator.cluster.version': rt.string,
    'cloud.provider': cloudProviderNameRT,
    'cloud.instance.id': rt.string,
    'cloud.region': rt.string,
    'cloud.service.name': rt.string,
    'service.environment': rt.string,
  }),
]);

export type ECSDocument = rt.TypeOf<typeof ECSDocumentRT>;

export const assetRT = rt.intersection([
  ECSDocumentRT,
  rt.type({
    'asset.ean': rt.string,
    'asset.id': rt.string,
    'asset.kind': assetKindRT,
  }),
  // mixed required and optional require separate hashes combined via intersection
  // https://github.com/gcanti/io-ts/blob/master/index.md#mixing-required-and-optional-props
  rt.partial({
    'asset.collection_version': rt.string,
    'asset.name': rt.string,
    'asset.type': assetTypeRT,
    'asset.status': assetStatusRT,
    'asset.parents': rt.union([rt.string, rt.array(rt.string)]),
    'asset.children': rt.union([rt.string, rt.array(rt.string)]),
    'asset.references': rt.union([rt.string, rt.array(rt.string)]),
    'asset.namespace': rt.string,
  }),
]);

export type Asset = rt.TypeOf<typeof assetRT>;

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

export const assetFiltersRT = rt.exact(
  rt.partial({
    type: rt.union([assetTypeRT, rt.array(assetTypeRT)]),
    kind: rt.union([assetKindRT, rt.array(assetKindRT)]),
    ean: rt.union([rt.string, rt.array(rt.string)]),
    id: rt.string,
    typeLike: rt.string,
    kindLike: rt.string,
    eanLike: rt.string,
    ['cloud.provider']: rt.string,
    ['cloud.region']: rt.string,
  })
);

export type AssetFilters = rt.TypeOf<typeof assetFiltersRT>;

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

export const sizeRT = rt.union([
  inRangeFromStringRt(1, 100),
  createLiteralValueFromUndefinedRT(10),
]);
export const assetDateRT = rt.union([dateRt, datemathStringRt]);

/**
 * Hosts
 */
export const getHostAssetsQueryOptionsRT = rt.exact(
  rt.partial({
    from: assetDateRT,
    to: assetDateRT,
    size: sizeRT,
    stringFilters: rt.string,
    filters: assetFiltersRT,
  })
);
export type GetHostAssetsQueryOptions = rt.TypeOf<typeof getHostAssetsQueryOptionsRT>;
export const getHostAssetsResponseRT = rt.type({
  hosts: rt.array(assetRT),
});
export type GetHostAssetsResponse = rt.TypeOf<typeof getHostAssetsResponseRT>;

/**
 * Services
 */
export const getServiceAssetsQueryOptionsRT = rt.exact(
  rt.partial({
    from: assetDateRT,
    to: assetDateRT,
    size: sizeRT,
    parent: rt.string,
    stringFilters: rt.string,
    filters: assetFiltersRT,
  })
);

export type GetServiceAssetsQueryOptions = rt.TypeOf<typeof getServiceAssetsQueryOptionsRT>;
export const getServiceAssetsResponseRT = rt.type({
  services: rt.array(assetRT),
});
export type GetServiceAssetsResponse = rt.TypeOf<typeof getServiceAssetsResponseRT>;

export function isAssetFilters(parsed: object): parsed is AssetFilters {
  // return true if parsed is {}
  if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) {
    return true;
  }
  const submittedKeys = Object.keys(parsed);
  const validated = assetFiltersRT.decode(parsed);

  if (validated._tag === 'Right') {
    const validatedKeys = Object.keys(validated.right);

    // Manually check for extra keys since iots won't fail in this case
    const extraSubmittedKeys = submittedKeys.filter((key) => !validatedKeys.includes(key));
    if (extraSubmittedKeys.length > 0) {
      return false;
    }

    return true;
  } else {
    return false;
  }
}
