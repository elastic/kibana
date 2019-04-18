/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiCodeBlock,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut
} from '@elastic/eui';
import { formatDateTimeLocal } from '../../../../common/formatting';

export function getElasticsearchInstructions(product, {
  doneWithMigration,
  esMonitoringUrl,
  checkForMigrationStatus,
  checkingMigrationStatus,
  hasCheckedMigrationStatus
}) {
  const enableCollectionStep = {
    title: 'Enable monitoring collection',
    children: (
      <Fragment>
        <p>
          Set the xpack.monitoring.collection.enabled setting to true on each node in the production cluster.
          By default, it is disabled (false).
        </p>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
          language="curl"
        >
          {`
PUT _cluster/settings
{
  "persistent": {
    "xpack.monitoring.collection.enabled": true
  }
}
          `}
        </EuiCodeBlock>
      </Fragment>
    )
  };

  const disableInternalCollectionStep = {
    title: 'Disable the default collection of Elasticsearch monitoring metrics',
    children: (
      <Fragment>
        <p>
          Disable the default collection of Elasticsearch monitoring metrics.
          Set xpack.monitoring.elasticsearch.collection.enabled to false on each node in the production cluster.
        </p>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
          language="curl"
        >
          {`
PUT _cluster/settings
{
  "persistent": {
    "xpack.monitoring.elasticsearch.collection.enabled": false
  }
}
          `}
        </EuiCodeBlock>
      </Fragment>
    )
  };

  const installMetricbeatStep = {
    title: 'Install Metricbeat on the same node as Elasticsearch',
    children: (
      <Fragment>
        <p>
          Follow <EuiLink to="https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-installation.html">the instructions here</EuiLink>
        </p>
      </Fragment>
    )
  };


  const enableMetricbeatModuleStep = {
    title: 'Enable and configure the Elasticsearch module in Metricbeat',
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
          language="bash"
        >
            metricbeat modules enable elasticsearch
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <p>Then, configure the module</p>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
        >
          {`
- module: elasticsearch
  metricsets:
    - ccr
    - cluster_stats
    - index
    - index_recovery
    - index_summary
    - ml_job
    - node_stats
    - shard
  period: 10s
  hosts: ["${esMonitoringUrl}"]
  xpack.enabled: true
`}
        </EuiCodeBlock>
      </Fragment>
    )
  };

  const configureMetricbeatStep = {
    title: 'Configure metricbeat to send to the monitoring cluster',
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
        >
          {`
output.elasticsearch:
  hosts: ["${esMonitoringUrl}"]
`}
        </EuiCodeBlock>
      </Fragment>

    )
  };

  const startMetricbeatStep = {
    title: 'Start Metricbeat',
    children: (
      <Fragment>
        <EuiCodeBlock
          isCopyable
        >
          {`
./metricbeat -e
`}
        </EuiCodeBlock>
      </Fragment>

    )
  };

  let migrationStatusStep = null;
  if (product.isInternalCollector || product.isPartiallyMigrated) {
    let status = null;
    if (hasCheckedMigrationStatus) {
      const lastInternallyCollectedTimestamp = formatDateTimeLocal(product.lastInternallyCollectedTimestamp);

      if (product.isPartiallyMigrated) {
        status = (
          <Fragment>
            <EuiSpacer size="m"/>
            <EuiCallOut
              size="s"
              color="warning"
              title={`We still see data coming from the default collection of Elasticsearch.
              Make sure you disable that before moving forward.`}
            >
              <p>Last internal collection occurred at {lastInternallyCollectedTimestamp}</p>
            </EuiCallOut>
          </Fragment>
        );
      }
      else {
        status = (
          <Fragment>
            <EuiSpacer size="m"/>
            <EuiCallOut
              size="s"
              color="warning"
              title={`We have not detected any monitoring data coming from Metricbeat for this Elasticsearch`}
            >
              <p>Last internal collection occurred at {lastInternallyCollectedTimestamp}</p>
            </EuiCallOut>
          </Fragment>
        );
      }
    }

    migrationStatusStep = {
      title: 'Migration status',
      status: 'incomplete',
      children: (
        <Fragment>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <p>
                Check that data is received from the Metricbeat
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={checkForMigrationStatus} isDisabled={checkingMigrationStatus}>
                {checkingMigrationStatus ? 'Checking for data...' : 'Check data' }
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
          {status}
        </Fragment>
      )
    };
  }
  else if (product.isFullyMigrated) {
    migrationStatusStep = {
      title: 'Migration status',
      status: 'complete',
      children: (
        <Fragment>
          <EuiCallOut
            size="s"
            color="success"
            title="Congratulations! We are now seeing monitoring data shipping from Metricbeat!"
          />
          <EuiSpacer size="m"/>
          <EuiButton onClick={doneWithMigration}>Done</EuiButton>
        </Fragment>
      )
    };
  }

  if (product.isPartiallyMigrated) {
    return [
      disableInternalCollectionStep,
      migrationStatusStep
    ];
  }

  return [
    enableCollectionStep,
    disableInternalCollectionStep,
    installMetricbeatStep,
    enableMetricbeatModuleStep,
    configureMetricbeatStep,
    startMetricbeatStep,
    migrationStatusStep
  ];
}
