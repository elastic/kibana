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
import { Monospace } from './components/monospace';

export function getElasticsearchInstructions(product, {
  doneWithMigration,
  esMonitoringUrl,
  checkForMigrationStatus,
  checkingMigrationStatus,
  hasCheckedMigrationStatus
}) {
  const disableInternalCollectionStep = {
    title: 'Disable the default collection of Elasticsearch monitoring metrics',
    children: (
      <Fragment>
        <p>
          Disable the default collection of Elasticsearch monitoring metrics.
          Set <Monospace>xpack.monitoring.elasticsearch.collection.enabled</Monospace> to false on each node in the production cluster.
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
    title: 'Install Metricbeat on the same server as Elasticsearch',
    children: (
      <Fragment>
        <p>
          Follow <EuiLink href="https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-installation.html" target="_blank">the instructions here</EuiLink>
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
            metricbeat modules enable elasticsearch-xpack
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <p>
          By default the module will collect Elasticsearch monitoring metrics from http://localhost:9200.
          If the local Elasticsearch node has a different address,
          you must specify it via the hosts setting in the modules.d/elasticsearch-xpack.yml file.
        </p>
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
      status: status ? 'warning' : 'incomplete',
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
    disableInternalCollectionStep,
    installMetricbeatStep,
    enableMetricbeatModuleStep,
    configureMetricbeatStep,
    startMetricbeatStep,
    migrationStatusStep
  ];
}
