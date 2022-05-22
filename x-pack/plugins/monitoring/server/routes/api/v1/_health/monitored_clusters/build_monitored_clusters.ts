/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, mapValues, merge, reduce } from 'lodash';

const reInternalMonitoring = /^\.monitoring-(es|kibana|beats|logstash)-7-[0-9]{4}\..*/;
const reMetricbeatMonitoring7 = /^\.monitoring-(es|kibana|beats|logstash|ent-search)-7.*-mb.*/;
const reMetricbeatMonitoring8 = /^\.ds-\.monitoring-(es|kibana|beats|logstash|ent-search)-8-mb.*/;

const getCollectionMode = (index: string) => {
  if (reInternalMonitoring.test(index)) return 'Internal monitoring';
  if (reMetricbeatMonitoring7.test(index)) return 'Metricbeat 7';
  if (reMetricbeatMonitoring8.test(index)) return 'Metricbeat 8';

  return 'Unknown collection mode';
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
 *           "Metricbeat 8": {
 *             "index": ".ds-.monitoring-es-8-mb-2022.05.17-000001",
 *             "lastSeen": "2022-05-17T16:56:52.929Z"
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
export const buildMonitoredClusters = (clustersBuckets: any[]) => {
  const monitoredClusters = clustersBuckets.reduce(
    (clusters, { key, meta, doc_count: _, ...products }) => {
      clusters[key] = buildMonitoredProducts(products);
      return clusters;
    },
    {}
  );

  return monitoredClusters;
};

/**
 * some products may not have a common identifier for their entities across the
 * metricsets and can create multiple aggregations. we make sure to merge these
 * so the output only includes a single product entry
 * we assume each aggregation is named as /productname(_aggsuffix)?/
 */
const buildMonitoredProducts = (clusterProducts: any) => {
  const monitoredProducts = mapValues(clusterProducts, ({ buckets }: { buckets: any[] }) => {
    return buckets.reduce((entities, { key, doc_count: _, ...metricsets }) => {
      entities[key] = buildMonitoredMetricsets(metricsets);
      return entities;
    }, {});
  });

  return reduce(
    monitoredProducts,
    (uniqProducts: any, metricsets: any, aggregationKey: string) => {
      if (isEmpty(metricsets)) return uniqProducts;

      const product = aggregationKey.split('_')[0];
      uniqProducts[product] = merge(uniqProducts[product], metricsets);
      return uniqProducts;
    },
    {}
  );
};

const buildMonitoredMetricsets = (productMetricsets: any) => {
  return mapValues(productMetricsets, ({ by_index: byIndex }: { by_index: { buckets: any[] } }) => {
    return byIndex.buckets.reduce((metricsets, { key, last_seen: lastSeen }) => {
      metricsets[getCollectionMode(key)] = {
        index: key,
        lastSeen: lastSeen.value_as_string,
      };
      return metricsets;
    }, {});
  });
};
