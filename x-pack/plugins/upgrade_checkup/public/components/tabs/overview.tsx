/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiCallOut, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

export class OverviewTab extends React.Component {
  public render() {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiTitle>
          <h3>Overview</h3>
        </EuiTitle>
        <EuiText>
          <p>
            This assistant helps you prepare for your upgrade from{' '}
            <strong>Elasticsearch 6.x</strong> to <strong>Elasticsearch 7</strong>.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiCallOut title="Backup your indices now!" color="warning" iconType="help">
          <p>
            Before starting your upgrade and before using these tools, backup your data using the{' '}
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
            documentation online.
          </p>
          {/* TODO: add in rest of copy */}
        </EuiText>
      </Fragment>
    );
  }
}
