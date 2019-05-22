/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';

interface EmptyIndexProps {
  basePath: string;
}

export const EmptyIndex = ({ basePath }: EmptyIndexProps) => (
  <EuiFlexGroup justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiSpacer size="xs" />
      <EuiPanel>
        <EuiEmptyPrompt
          iconType="uptimeApp"
          title={
            <EuiTitle size="l">
              <h3>
                <FormattedMessage
                  id="xpack.uptime.emptyState.noDataTitle"
                  defaultMessage="No uptime data available"
                />
              </h3>
            </EuiTitle>
          }
          body={
            <Fragment>
              <p>
                <FormattedMessage
                  id="xpack.uptime.emptyState.configureHeartbeatToGetStartedMessage"
                  defaultMessage="{configureHeartbeatLink} to start logging uptime data."
                  values={{
                    configureHeartbeatLink: (
                      <EuiLink
                        target="_blank"
                        href={`${basePath}/app/kibana#/home/tutorial/uptimeMonitors`}
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
      </EuiPanel>
    </EuiFlexItem>
  </EuiFlexGroup>
);
