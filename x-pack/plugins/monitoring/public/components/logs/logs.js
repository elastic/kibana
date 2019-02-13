/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { PureComponent } from 'react';
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
    width: '15%',
    render: timestamp => formatDateTimeLocal(timestamp),
  },
  {
    field: 'level',
    name: 'Level',
    width: '5%'
  },
  {
    field: 'message',
    name: 'Message',
    width: '65%'
  },
  {
    field: 'component',
    name: 'Component',
    width: '15%'
  },
];

export class Logs extends PureComponent {
  state = {
    pageIndex: 0,
    pageSize: 5,
    sortField: 'level',
    sortDirection: 'asc',
    selectedItems: [],
  }

  render() {
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
          items={this.props.logs}
          columns={columns}
        />
        <EuiSpacer size="m"/>
        <EuiCallOut
          size="m"
          title="Want to see more logs?"
          iconType="loggingApp"
        >
          <p>
            Visit the <EuiLink href={`${chrome.getBasePath()}/app/infra#/logs`}>Logs UI</EuiLink> to dive deeper.
          </p>
        </EuiCallOut>
      </div>
    );
  }
}
