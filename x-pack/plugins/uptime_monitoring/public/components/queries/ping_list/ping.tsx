/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing type definition
import { EuiHealth, EuiInMemoryTable, EuiPanel } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { Query } from 'react-apollo';
import { createGetPingsQuery } from './get_pings';

export const Pings = () => (
  <Query pollInterval={1000} query={createGetPingsQuery()}>
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }
      const { pings } = data;
      return (
        // @ts-ignore no definition for prop in typings
        <EuiPanel betaBadgeLabel="Ping List" paddingSize="l">
          <EuiInMemoryTable
            columns={[
              {
                field: 'monitor.status',
                name: 'Status',
                render: (status: string) => (
                  <EuiHealth color={status === 'up' ? 'success' : 'danger'}>
                    {status === 'up' ? 'Up' : 'Down'}
                  </EuiHealth>
                ),
              },
              {
                field: 'timestamp',
                name: 'Timestamp',
                render: (timestamp: string) =>
                  moment(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS Z'),
              },
              {
                field: 'monitor.ip',
                name: 'IP',
              },
              {
                field: 'monitor.id',
                name: 'Id',
              },
            ]}
            items={pings}
          />
        </EuiPanel>
      );
    }}
  </Query>
);
