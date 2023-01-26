/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isEmpty, mapValues, merge, omitBy, reduce } from 'lodash';
import { MonitoredProduct } from '../types';

enum CollectionMode {
  Internal = 'internal-monitoring',
  Metricbeat7 = 'metricbeat-7',
  Metricbeat8 = 'metricbeat-8',
  Package = 'package',
  Unknown = 'unknown',
}

interface MonitoredMetricsets {
  [metricset: string]: {
    [collectionMode in CollectionMode]: {
      index: string;
      lastSeen: string;
    };
  };
}

interface MonitoredEntities {
  [entityId: string]: MonitoredMetricsets;
}

type MonitoredProducts = {
  [product in MonitoredProduct]: MonitoredEntities;
};

export interface MonitoredClusters {
  [clusterUuid: string]: MonitoredProducts;
}

const internalMonitoringPattern = /(.*:)?\.monitoring-(es|kibana|beats|logstash)-7-[0-9]{4}\..*/;
const metricbeatMonitoring7Pattern =
  /(.*:)?\.monitoring-(es|kibana|beats|logstash|ent-search)-7.*-mb.*/;
const metricbeatMonitoring8Pattern =
  /(.*:)?\.ds-\.monitoring-(es|kibana|beats|logstash|ent-search)-8-mb.*/;
const packagePattern = /(.*:)?\.ds-metrics-(elasticsearch|kibana|beats|logstash)\..*/;

const getCollectionMode = (index: string): CollectionMode => {
  if (internalMonitoringPattern.test(index)) return CollectionMode.Internal;
  if (metricbeatMonitoring7Pattern.test(index)) return CollectionMode.Metricbeat7;
  if (metricbeatMonitoring8Pattern.test(index)) return CollectionMode.Metricbeat8;
  if (packagePattern.test(index)) return CollectionMode.Package;

  return CollectionMode.Unknown;
};

/**
 * builds a normalized representation of the monitoring state from the provided
 * query buckets with a cluster->product->entity->metricset hierarchy where
 *  cluster: the monitored cluster identifier
 *  product: the monitored products (eg elasticsearch)
 *  entity: the product unit of work (eg node)
 *  metricset: the collected metricsets for a given entity
 *
 * example:
 * {
 *   "f-05NylTQg2G7rQXHnvYbA": {
 *     "elasticsearch": {
 *       "9NXA8Ov5QCeWAalKIHWFJg": {
 *         "shard": {
 *           "metricbeat-8": {
 *             "index": ".ds-.monitoring-es-8-mb-2022.05.17-000001",
 *             "lastSeen": "2022-05-17T16:56:52.929Z"
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export const buildMonitoredClusters = (
  clustersBuckets: any[],
  logger: Logger
): MonitoredClusters => {
  return clustersBuckets.reduce((clusters, { key, doc_count: _, ...products }) => {
    clusters[key] = buildMonitoredProducts(products, logger);
    return clusters;
  }, {});
};

/**
 * some products may not have a common identifier for their entities across the
 * metricsets and can create multiple aggregations. we make sure to merge these
 * so the output only includes a single product entry
 * we assume each aggregation is named as /productname(_aggsuffix)?/
 */
const buildMonitoredProducts = (rawProducts: any, logger: Logger): MonitoredProducts => {
  const validProducts = Object.values(MonitoredProduct);
  const products = mapValues(rawProducts, (value, key) => {
    if (!validProducts.some((product) => key.startsWith(product))) {
      logger.warn(`buildMonitoredProducts: ignoring unknown product aggregation key (${key})`);
      return {};
    }

    return buildMonitoredEntities(value.buckets);
  });

  return reduce(
    products,
    (uniqProducts: any, entities: any, aggregationKey: string) => {
      if (isEmpty(entities)) return uniqProducts;

      const product = aggregationKey.split('_')[0];
      uniqProducts[product] = merge(uniqProducts[product], entities);
      return uniqProducts;
    },
    {}
  );
};

const buildMonitoredEntities = (entitiesBuckets: any[]): MonitoredEntities => {
  return entitiesBuckets.reduce(
    (entities, { key, key_as_string: keyAsString, doc_count: _, ...metricsets }) => {
      entities[keyAsString || key] = buildMonitoredMetricsets(metricsets);
      return entities;
    },
    {}
  );
};

const buildMonitoredMetricsets = (rawMetricsets: any): MonitoredMetricsets => {
  const monitoredMetricsets = mapValues(
    rawMetricsets,
    ({ by_index: byIndex }: { by_index: { buckets: any[] } }) => {
      return byIndex.buckets.reduce((metricsets, { key, last_seen: lastSeen }) => {
        metricsets[getCollectionMode(key)] = {
          index: key,
          lastSeen: lastSeen.value_as_string,
        };
        return metricsets;
      }, {});
    }
  );

  return omitBy(monitoredMetricsets, isEmpty) as unknown as MonitoredMetricsets;
};
