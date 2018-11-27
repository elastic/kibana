/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiCallOut,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';

export class OverviewTab extends React.Component {
  public render() {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiText>
          <p>
            This assistant helps you prepare for your upgrade from{' '}
            <strong>Elasticsearch 6.x</strong> to <strong>Elasticsearch 7</strong>.
          </p>
        </EuiText>
        <EuiSpacer />

        <EuiPageContent>
          <EuiPageContentBody>
            <EuiCallOut title="Backup your indices now!" color="warning" iconType="help">
              <p>
                Before starting your upgrade and before using these tools, backup your data using
                the{' '}
                <EuiLink
                  href="https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-snapshots.html"
                  target="_blank"
                >
                  snapshot/restore
                </EuiLink>{' '}
                API.
              </p>
            </EuiCallOut>
            <EuiSpacer />
            <EuiText>
              <p>
                Read more about important changes in the{' '}
                <EuiLink
                  href="https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-7.0.html"
                  target="_blank"
                >
                  Breaking Changes
                </EuiLink>{' '}
                documentation online. Use this tool to run a series of checks on your cluster,
                nodes, and indices and find out about any known problems that need to be addressed
                before upgrading.
              </p>
              <h2>Deprecation Logging</h2>
              <p>
                Elasticsearch comes with a deprecation logger which will log a message whenever
                deprecated functionality is used. Enable or disable deprecation logging on your
                cluster here. This is enabled by default, beginning in Elasticsearch 5.0.
              </p>
            </EuiText>
            <EuiSpacer />
            <DeprecationLoggingToggle />
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }
}
