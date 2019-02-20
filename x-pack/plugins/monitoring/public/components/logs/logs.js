/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { PureComponent } from 'react';
import { capitalize } from 'lodash';
import chrome from 'ui/chrome';
import {
  EuiBasicTable,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { formatDateTimeLocal } from '../../../common/formatting';

const columns = [
  {
    field: 'timestamp',
    name: 'Timestamp',
    width: '12%',
    render: timestamp => formatDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: 'Level',
    width: '5%',
  },
  {
    field: 'type',
    name: 'Type',
    width: '10%',
    render: type => capitalize(type),
  },
  {
    field: 'message',
    name: 'Message',
    width: '55%'
  },
  {
    field: 'component',
    name: 'Component',
    width: '18%'
  },
];

function getLogsUiLink(clusterUuid, nodeUuid) {
  const base = `${chrome.getBasePath()}/app/infra#/logs`;
  const params = [];
  if (clusterUuid) {
    params.push(`elasticsearch.cluster.uuid:${clusterUuid}`);
  }
  if (nodeUuid) {
    params.push(`elasticsearch.node.id:${nodeUuid}`);
  }

  if (params.length === 0) {
    return base;
  }

  return `${base}?filter=${params.join(',')}`;
}

export class Logs extends PureComponent {
  render() {
    const { clusterUuid, nodeUuid, logs }  = this.props;

    return (
      <div>
        <EuiTitle>
          <h1>Logs</h1>
        </EuiTitle>
        <EuiText size="s">
          <p>Showing the most recent logs, up to 10 total logs</p>
        </EuiText>
        <EuiSpacer size="m"/>
        <EuiBasicTable
          items={logs || []}
          columns={columns}
        />
        <EuiSpacer size="m"/>
        <EuiCallOut
          size="m"
          title="Want to see more logs?"
          iconType="loggingApp"
        >
          <p>
            Visit the <EuiLink href={getLogsUiLink(clusterUuid, nodeUuid)}>Logs UI</EuiLink> to dive deeper.
          </p>
        </EuiCallOut>
      </div>
    );
  }
}
