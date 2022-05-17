import { mapValues, omit } from 'lodash';

const reInternalMonitoring = /^\.monitoring-(es|kibana|beats|logstash)-7-[0-9]{4}\..*/;
const reMetricbeatMonitoring7 = /^\.monitoring-(es|kibana|beats|logstash)-7-mb.*/;
const reMetricbeatMonitoring8 = /^\.ds-\.monitoring-(es|kibana|beats|logstash)-8-mb.*/;

const getCollectionMode = (indice) => {
  if (reInternalMonitoring.test(indice)) return 'Internal monitoring';
  if (reMetricbeatMonitoring7.test(indice)) return 'Metricbeat 7';
  if (reMetricbeatMonitoring8.test(indice)) return 'Metricbeat 8';

  return 'Unknown collection mode';
};

export const buildMonitoredClusters = (clustersBuckets) => {
  const monitoredClusters = clustersBuckets.reduce(
    (clusters, { key, meta, doc_count, ...products }) => {
      clusters[key] = buildMonitoredProducts(products);
      return clusters;
    },
    {}
  );

  return monitoredClusters;
};

const buildMonitoredProducts = (clusterProducts) => {
  return mapValues(clusterProducts, ({ buckets }) => {
    // each bucket represents a product entity (eg node/pipeline/process) with
    // its associated metricsets

    return buckets.reduce((entities, { key, doc_count, ...metricsets }) => {
      entities[key] = buildMonitoredMetricsets(metricsets);
      return entities;
    }, {});
  });
};

const buildMonitoredMetricsets = (metricsets) => {
  return mapValues(metricsets, ({ by_index }) => {
    return by_index.buckets.reduce((metricsets, { key, last_seen }) => {
      metricsets[getCollectionMode(key)] = {
        index: key,
        lastSeen: last_seen.value_as_string,
      };
      return metricsets;
    }, {});
  });
};
