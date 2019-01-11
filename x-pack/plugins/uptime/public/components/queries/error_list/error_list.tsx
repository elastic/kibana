/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore missing typings
import { EuiInMemoryTable, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
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
        return i18n.translate('xpack.uptime.errorList.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.errorList.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
      }
      const { errorList } = data;
      return (
        <Fragment>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage id="xpack.uptime.errorList.title" defaultMessage="Error list" />
            </h5>
          </EuiTitle>
          <EuiPanel>
            <EuiInMemoryTable
              items={errorList}
              columns={[
                {
                  field: 'type',
                  name: i18n.translate('xpack.uptime.errorList.columns.type', {
                    defaultMessage: 'Error type',
                  }),
                  sortable: true,
                },
                {
                  field: 'monitorId',
                  name: i18n.translate('xpack.uptime.errorList.columns.monitorId', {
                    defaultMessage: 'Monitor ID',
                  }),
                  render: (id: string) => <Link to={`/monitor/${id}`}>{id}</Link>,
                  sortable: true,
                  width: '25%',
                },
                {
                  field: 'count',
                  name: i18n.translate('xpack.uptime.errorList.columns.count', {
                    defaultMessage: 'Count',
                  }),
                  sortable: true,
                },
                {
                  field: 'timestamp',
                  name: i18n.translate('xpack.uptime.errorList.columns.latestError', {
                    defaultMessage: 'Latest error',
                  }),
                  sortable: true,
                  render: (timestamp: string) => moment(timestamp).fromNow(),
                },
                {
                  field: 'statusCode',
                  name: i18n.translate('xpack.uptime.errorList.columns.statusCode', {
                    defaultMessage: 'Status code',
                  }),
                  sortable: true,
                },
                {
                  field: 'latestMessage',
                  name: i18n.translate('xpack.uptime.errorList.columns.latestMessage', {
                    defaultMessage: 'Latest message',
                  }),
                  sortable: true,
                  width: '40%',
                },
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
