/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { formatNumber } from 'plugins/monitoring/lib/format_number';
import { ClusterItemContainer, HealthStatusIndicator, BytesUsage, BytesPercentageUsage } from './helpers';
import {
  EuiFlexGrid,
  EuiFlexItem,
  EuiLink,
  EuiTitle,
  EuiPanel,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
} from '@elastic/eui';
import { LicenseText } from './license_text';

const calculateShards = shards => {
  const total = get(shards, 'total', 0);
  let primaries = get(shards, 'primaries', 'N/A');
  let replicas = 'N/A';

  // we subtract primaries from total to get replica count, so if we don't know primaries, then
  //  we cannot know replicas (because we'd be showing the wrong number!)
  if (primaries !== 'N/A') {
    replicas = formatNumber(total - primaries, 'int_commas');
    primaries = formatNumber(primaries, 'int_commas');
  }

  return {
    primaries,
    replicas
  };
};

export function ElasticsearchPanel(props) {

  const clusterStats = props.cluster_stats || {};
  const nodes = clusterStats.nodes;
  const indices = clusterStats.indices;

  const goToElasticsearch = () => props.changeUrl('elasticsearch');
  const goToNodes = () => props.changeUrl('elasticsearch/nodes');
  const goToIndices = () => props.changeUrl('elasticsearch/indices');

  const { primaries, replicas } = calculateShards(get(props, 'cluster_stats.indices.shards', {}));

  const statusIndicator = (
    <HealthStatusIndicator status={clusterStats.status} />
  );

  const showMlJobs = () => {
    // if license doesn't support ML, then `ml === null`
    if (props.ml) {
      return [
        <EuiDescriptionListTitle key="mlJobsListTitle">Jobs</EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key="mlJobsCount" data-test-subj="esMlJobs">{ props.ml.jobs }</EuiDescriptionListDescription>
      ];
    }
    return null;
  };

  const licenseText = <LicenseText license={props.license} showLicenseExpiration={props.showLicenseExpiration} />;

  return (
    <ClusterItemContainer {...props} statusIndicator={statusIndicator} url="elasticsearch" title="Elasticsearch" extras={licenseText}>
      <EuiFlexGrid columns={3}>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToElasticsearch}
                  aria-label="Elasticsearch Overview"
                  data-test-subj="esOverview"
                >
                  Overview
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Version</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esVersion">
                { get(nodes, 'versions[0]') || 'N/A' }
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Uptime</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esUptime">
                { formatNumber(get(nodes, 'jvm.max_uptime_in_millis'), 'time_since') }
              </EuiDescriptionListDescription>
              {showMlJobs()}
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  data-test-subj="esNumberOfNodes"
                  onClick={goToNodes}
                >
                  Nodes: { formatNumber(get(nodes, 'count.total'), 'int_commas') }
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Disk Available</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskAvailable">
                <BytesUsage
                  usedBytes={get(nodes, 'fs.available_in_bytes')}
                  maxBytes={get(nodes, 'fs.total_in_bytes')}
                />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>JVM Heap</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esJvmHeap">
                <BytesPercentageUsage
                  usedBytes={get(nodes, 'jvm.mem.heap_used_in_bytes')}
                  maxBytes={get(nodes, 'jvm.mem.heap_max_in_bytes')}
                />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToIndices}
                  data-test-subj="esNumberOfIndices"
                  aria-label={`Elasticsearch Indices: ${ formatNumber(get(indices, 'count'), 'int_commas') }`}
                >
                  Indices: { formatNumber(get(indices, 'count'), 'int_commas') }
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                Documents
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDocumentsCount">
                { formatNumber(get(indices, 'docs.count'), 'int_commas') }
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                Disk Usage
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskUsage">
                { formatNumber(get(indices, 'store.size_in_bytes'), 'byte') }
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                Primary Shards
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esPrimaryShards">
                { primaries }
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                Replica Shards
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esReplicaShards">
                { replicas }
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
