/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing typings
import { EuiInMemoryTable, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { Link } from 'react-router-dom';
import { getErrorListQuery } from './get_error_list';

interface ErrorListProps {
  dateRangeStart: number;
  dateRangeEnd: number;
  filters?: string;
}

export const ErrorList = ({ dateRangeStart, dateRangeEnd, filters }: ErrorListProps) => (
  <Query query={getErrorListQuery} variables={{ dateRangeStart, dateRangeEnd, filters }}>
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }
      const { errorList } = data;
      return (
        <Fragment>
          <EuiTitle size="xs">
            <h5>Error list</h5>
          </EuiTitle>
          <EuiPanel>
            <EuiInMemoryTable
              items={errorList}
              columns={[
                { field: 'type', name: 'Error Type', sortable: true },
                {
                  field: 'monitorId',
                  name: 'Monitor ID',
                  render: (id: string) => <Link to={`/monitor/${id}`}>{id}</Link>,
                  sortable: true,
                },
                { field: 'count', name: 'Count', sortable: true },
                { field: 'latestMessage', name: 'Latest message', sortable: true, width: '40%' },
                { field: 'statusCode', name: 'Response code', sortable: true },
              ]}
              sorting={true}
              pagination={{ initialPageSize: 10, pageSizeOptions: [5, 10, 20, 50] }}
            />
          </EuiPanel>
        </Fragment>
      );
    }}
  </Query>
);
