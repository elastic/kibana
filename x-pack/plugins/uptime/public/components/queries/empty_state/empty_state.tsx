/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiLink, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { getDocCountQuery } from './get_doc_count';

interface EmptyStateProps {
  children: JSX.Element[];
}

type Props = EmptyStateProps & UptimeCommonProps;

export const EmptyState = ({ autorefreshInterval, autorefreshIsPaused, children }: Props) => (
  <Query
    query={getDocCountQuery}
    pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
  >
    {({ loading, error, data }) => {
      if (loading) {
        return i18n.translate('xpack.uptime.emptyState.loadingMessage', {
          defaultMessage: 'Loading…',
        });
      }
      if (error) {
        return i18n.translate('xpack.uptime.emptyState.errorMessage', {
          values: { message: error.message },
          defaultMessage: 'Error {message}',
        });
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
                  <h3>
                    <FormattedMessage
                      id="xpack.uptime.emptyState.noDataTitle"
                      defaultMessage="No Uptime Data"
                    />
                  </h3>
                </EuiTitle>
              }
              body={
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="xpack.uptime.emptyState.noDataDescription"
                      defaultMessage="There is no uptime data available."
                    />
                  </p>
                  <p>
                    <FormattedMessage
                      id="xpack.uptime.emptyState.configureHeartbeatToGetStartedMessage"
                      defaultMessage="{configureHeartbeatLink} to start logging uptime data."
                      values={{
                        configureHeartbeatLink: (
                          <EuiLink
                            target="_blank"
                            href="https://www.elastic.co/guide/en/beats/heartbeat/current/configuring-howto-heartbeat.html"
                          >
                            <FormattedMessage
                              id="xpack.uptime.emptyState.configureHeartbeatLinkText"
                              defaultMessage="Configure Heartbeat"
                            />
                          </EuiLink>
                        ),
                      }}
                    />
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
