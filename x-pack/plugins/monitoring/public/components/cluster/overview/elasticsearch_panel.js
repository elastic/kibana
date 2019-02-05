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
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

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

function ElasticsearchPanelUi(props) {

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
        <EuiDescriptionListTitle key="mlJobsListTitle">
          <FormattedMessage
            id="xpack.monitoring.cluster.overview.esPanel.jobsLabel"
            defaultMessage="Jobs"
          />
        </EuiDescriptionListTitle>,
        <EuiDescriptionListDescription key="mlJobsCount" data-test-subj="esMlJobs">{ props.ml.jobs }</EuiDescriptionListDescription>
      ];
    }
    return null;
  };

  const licenseText = <LicenseText license={props.license} showLicenseExpiration={props.showLicenseExpiration} />;

  return (
    <ClusterItemContainer
      {...props}
      statusIndicator={statusIndicator}
      url="elasticsearch"
      title="Elasticsearch"
      extras={licenseText}
    >
      <EuiFlexGrid columns={4}>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToElasticsearch}
                  aria-label={props.intl.formatMessage({
                    id: 'xpack.monitoring.cluster.overview.esPanel.overviewLinkAriaLabel', defaultMessage: 'Elasticsearch Overview' })}
                  data-test-subj="esOverview"
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.overviewLinkLabel"
                    defaultMessage="Overview"
                  />
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.versionLabel"
                  defaultMessage="Version"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esVersion">
                { props.version || props.intl.formatMessage({
                  id: 'xpack.monitoring.cluster.overview.esPanel.versionNotAvailableDescription', defaultMessage: 'N/A' }) }
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.uptimeLabel"
                  defaultMessage="Uptime"
                />
              </EuiDescriptionListTitle>
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
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.nodesTotalLinkLabel"
                    defaultMessage="Nodes: {nodesTotal}"
                    values={{ nodesTotal: formatNumber(get(nodes, 'count.total'), 'int_commas') }}
                  />
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.diskAvailableLabel"
                  defaultMessage="Disk Available"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskAvailable">
                <BytesUsage
                  usedBytes={get(nodes, 'fs.available_in_bytes')}
                  maxBytes={get(nodes, 'fs.total_in_bytes')}
                />
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.jvmHeapLabel"
                  defaultMessage="{javaVirtualMachine} Heap"
                  values={{ javaVirtualMachine: 'JVM' }}
                />
              </EuiDescriptionListTitle>
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
                  aria-label={props.intl.formatMessage({
                    id: 'xpack.monitoring.cluster.overview.esPanel.indicesCountLinkAriaLabel',
                    defaultMessage: 'Elasticsearch Indices: {indicesCount}' },
                  { indicesCount: formatNumber(get(indices, 'count'), 'int_commas') })}
                >
                  <FormattedMessage
                    id="xpack.monitoring.cluster.overview.esPanel.indicesCountLinkLabel"
                    defaultMessage="Indices: {indicesCount}"
                    values={{ indicesCount: formatNumber(get(indices, 'count'), 'int_commas') }}
                  />
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.documentsLabel"
                  defaultMessage="Documents"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDocumentsCount">
                { formatNumber(get(indices, 'docs.count'), 'int_commas') }
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.diskUsageLabel"
                  defaultMessage="Disk Usage"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esDiskUsage">
                { formatNumber(get(indices, 'store.size_in_bytes'), 'byte') }
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.primaryShardsLabel"
                  defaultMessage="Primary Shards"
                />
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="esPrimaryShards">
                { primaries }
              </EuiDescriptionListDescription>

              <EuiDescriptionListTitle>
                <FormattedMessage
                  id="xpack.monitoring.cluster.overview.esPanel.replicaShardsLabel"
                  defaultMessage="Replica Shards"
                />
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

export const ElasticsearchPanel = injectI18n(ElasticsearchPanelUi);
