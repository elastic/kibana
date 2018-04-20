/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { formatNumber } from 'plugins/monitoring/lib/format_number';
import { ClusterItemContainer, BytesPercentageUsage } from './helpers';
import { Tooltip } from 'plugins/monitoring/components/tooltip';
import { LOGSTASH } from '../../../../common/constants';

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

export function LogstashPanel(props) {
  if (!props.node_count) {
    return null;
  }

  const goToLogstash = () => props.changeUrl('logstash');
  const goToNodes = () => props.changeUrl('logstash/nodes');
  const goToPipelines = () => props.changeUrl('logstash/pipelines');

  return (
    <ClusterItemContainer {...props} url="logstash" title="Logstash">
      <EuiFlexGrid columns={3}>
        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToLogstash}
                  aria-label="Logstash Overview"
                >
                  Overview
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column" data-test-subj="logstash_overview">
              <EuiDescriptionListTitle>Events Received</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsEventsReceived">
                { formatNumber(props.events_in_total, '0.[0]a') }
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>Events Emitted</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsEventsEmitted">
                { formatNumber(props.events_out_total, '0.[0]a') }
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToNodes}
                  data-test-subj="lsNodes"
                  aria-label={`Logstash Nodes: ${ props.node_count}`}
                >
                  Nodes: <span data-test-subj="number_of_logstash_instances">{ props.node_count }</span>
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>Uptime</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsUptime">
                { formatNumber(props.max_uptime, 'time_since') }
              </EuiDescriptionListDescription>
              <EuiDescriptionListTitle>JVM Heap</EuiDescriptionListTitle>
              <EuiDescriptionListDescription data-test-subj="lsJvmHeap">
                <BytesPercentageUsage usedBytes={props.avg_memory_used} maxBytes={props.avg_memory} />
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel paddingSize="m">
            <EuiTitle size="s">
              <h3>
                <EuiLink
                  onClick={goToPipelines}
                  data-test-subj="lsPipelines"
                  aria-label={`Logstash Pipelines (beta feature): ${ props.pipeline_count }`}
                >
                  <Tooltip
                    text="Beta Feature"
                    placement="bottom"
                    trigger="hover"
                  >
                    <span className="kuiIcon fa-flask betaIcon" />
                  </Tooltip>
                  Pipelines: <span data-test-subj="number_of_logstash_pipelines">{ props.pipeline_count }</span>
                </EuiLink>
              </h3>
            </EuiTitle>
            <EuiHorizontalRule margin="m" />
            <EuiDescriptionList type="column">
              <EuiDescriptionListTitle>With Memory Queues</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{ props.queue_types[LOGSTASH.QUEUE_TYPES.MEMORY] }</EuiDescriptionListDescription>
              <EuiDescriptionListTitle>With Persistent Queues</EuiDescriptionListTitle>
              <EuiDescriptionListDescription>{ props.queue_types[LOGSTASH.QUEUE_TYPES.PERSISTED] }</EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGrid>
    </ClusterItemContainer>
  );
}
