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
  EuiButton
} from '@elastic/eui';

export function getKibanaInstructions({ kibanaUrl, esMonitoringUrl, checkForData }) {
  return [
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
    {
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
    },
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
    {
      title: 'Migration status',
      status: 'incomplete',
      children: (
        <Fragment>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <p>
                Check that data is received from the Metricbeat apache module
              </p>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={checkForData}>Check data</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      )
    }
  ];
}
