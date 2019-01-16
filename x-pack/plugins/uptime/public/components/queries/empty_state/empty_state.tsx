/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiLink, EuiTitle } from '@elastic/eui';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { getDocCountQuery } from './get_doc_count';

interface EmptyStateProps {
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
  children: JSX.Element[];
}

export const EmptyState = ({
  autorefreshInterval,
  autorefreshEnabled,
  children,
}: EmptyStateProps) => (
  <Query
    query={getDocCountQuery}
    pollInterval={autorefreshEnabled ? autorefreshInterval : undefined}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return 'Loading...';
      }
      if (error) {
        return `Error ${error.message}`;
      }

      const {
        getDocCount: { count },
      } = data;
      return (
        <Fragment>
          {!count && (
            <EuiEmptyPrompt
              title={
                <EuiTitle size="l">
                  <h3>No Uptime Data</h3>
                </EuiTitle>
              }
              body={
                <Fragment>
                  <p>There is no uptime data available.</p>
                  <p>
                    {
                      <EuiLink
                        target="_blank"
                        href="https://www.elastic.co/guide/en/beats/heartbeat/6.5/configuring-howto-heartbeat.html"
                      >
                        Configure Heartbeat
                      </EuiLink>
                    }
                    &nbsp;to start logging uptime data.
                  </p>
                </Fragment>
              }
            />
          )}
          {count > 0 && children}
        </Fragment>
      );
    }}
  </Query>
);
