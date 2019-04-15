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

export function getKibanaInstructions(product, {
  doneWithMigration,
  kibanaUrl,
  esMonitoringUrl,
  checkForMigrationStatus,
  checkingMigrationStatus,
  hasCheckedMigrationStatus
}) {
  const disableKibanaInternalCollection = {
    title: 'Disable the default collection of Kibana monitoring metrics',
    children: (
      <Fragment>
        <p>Add the following setting in the Kibana configuration file (kibana.yml):</p>
        <EuiSpacer size="s"/>
        <EuiCodeBlock
          isCopyable
          language="bash"
        >
          xpack.monitoring.kibana.collection.enabled: false
        </EuiCodeBlock>
        <EuiSpacer size="s"/>
        <p>
          Leave the xpack.monitoring.enabled set to its default value (true).
        </p>
      </Fragment>
    )
  };

  let updateStep = null;
  if (product.isInternalCollector || product.isPartiallyMigrated) {
    let status = null;
    if (hasCheckedMigrationStatus) {
      if (product.isPartiallyMigrated) {
        const lastInternallyCollectedTimestamp = formatDateTimeLocal(product.lastInternallyCollectedTimestamp);
        status = (
          <Fragment>
            <EuiSpacer size="m"/>
            <EuiCallOut
              size="s"
              color="warning"
              title="We still see data coming from the default collection of Kibana. Make sure you disable that before moving forward."
            >
              <p>Last default collection occurred at {lastInternallyCollectedTimestamp}</p>
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
              title={`We have not detected any monitoring data coming from Metricbeat for this Kibana`}
            />
          </Fragment>
        );
      }
    }

    updateStep = {
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
    updateStep = {
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
      disableKibanaInternalCollection,
      updateStep
    ];
  }

  const instructions = [
    {
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
    },
    disableKibanaInternalCollection,
    {
      title: 'Install Metricbeat on the same node as Kibana',
      children: (
        <Fragment>
          <p>
            Follow <EuiLink to="https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-installation.html">the instructions here</EuiLink>
          </p>
        </Fragment>
      )
    },
    {
      title: 'Enable and configure the Kibana module in Metricbeat',
      children: (
        <Fragment>
          <EuiCodeBlock
            isCopyable
            language="bash"
          >
            metricbeat modules enable kibana
          </EuiCodeBlock>
          <EuiSpacer size="s"/>
          <p>Then, configure the module</p>
          <EuiSpacer size="s"/>
          <EuiCodeBlock
            isCopyable
          >
            {`
- module: kibana
  metricsets:
  - stats
  period: 10s
  hosts: ["${kibanaUrl}"]
  xpack.enabled: true
`}
          </EuiCodeBlock>
        </Fragment>
      )
    },
    {
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
    },
    {
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
    },
    updateStep
  ];

  return instructions;
}
