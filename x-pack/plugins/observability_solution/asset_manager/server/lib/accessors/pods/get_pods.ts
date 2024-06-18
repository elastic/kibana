/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Asset } from '../../../../common/types_api';
import { GetPodsOptionsPublic } from '../../../../common/types_client';
import {
  AssetClientDependencies,
  AssetClientOptionsWithInjectedValues,
} from '../../asset_client_types';
import { parseEan } from '../../parse_ean';
import { collectPods } from '../../collectors/pods';
import { validateStringDateRange } from '../../validators/validate_date_range';

export type GetPodsOptions = GetPodsOptionsPublic & AssetClientDependencies;
export type GetPodsOptionsInjected = AssetClientOptionsWithInjectedValues<GetPodsOptions>;

export async function getPods(options: GetPodsOptionsInjected): Promise<{ pods: Asset[] }> {
  validateStringDateRange(options.from, options.to);

  const metricsIndices = await options.metricsClient.getMetricIndices({
    savedObjectsClient: options.savedObjectsClient,
  });

  const filters: QueryDslQueryContainer[] = [];

  if (options.filters?.ean) {
    const ean = Array.isArray(options.filters.ean) ? options.filters.ean[0] : options.filters.ean;
    const { kind, id } = parseEan(ean);

    // if EAN filter isn't targeting a pod asset, we don't need to do this query
    if (kind !== 'pod') {
      return {
        pods: [],
      };
    }

    filters.push({
      term: {
        'kubernetes.pod.uid': id,
      },
    });
  }

  if (options.filters?.id) {
    const fn = options.filters.id.includes('*') ? 'wildcard' : 'term';
    filters.push({
      [fn]: {
        'kubernetes.pod.uid': options.filters.id,
      },
    });
  }

  if (options.filters?.['orchestrator.cluster.name']) {
    filters.push({
      term: {
        'orchestrator.cluster.name': options.filters['orchestrator.cluster.name'],
      },
    });
  }

  if (options.filters?.['cloud.provider']) {
    filters.push({
      term: {
        'cloud.provider': options.filters['cloud.provider'],
      },
    });
  }

  if (options.filters?.['cloud.region']) {
    filters.push({
      term: {
        'cloud.region': options.filters['cloud.region'],
      },
    });
  }

  const { assets } = await collectPods({
    client: options.elasticsearchClient,
    from: options.from,
    to: options.to || 'now',
    filters,
    sourceIndices: {
      metrics: metricsIndices,
      logs: options.sourceIndices.logs,
    },
  });

  return {
    pods: assets,
  };
}
