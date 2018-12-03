/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiCallOut,
  // @ts-ignore
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiText,
} from '@elastic/eui';

import { UpgradeCheckupTabComponent } from '../../types';
import { DeprecationLoggingToggle } from './deprecation_logging_toggle';
import { Summary } from './summary';

export class OverviewTab extends UpgradeCheckupTabComponent {
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

        <Summary {...this.props} />

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
            <EuiText grow={false}>
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
              <p>
                Use this tool to run a series of checks on your cluster, nodes, and indices and find
                out about any known problems that need to be addressed before upgrading.
              </p>
            </EuiText>

            <EuiHorizontalRule />

            <EuiDescribedFormGroup
              idAria="deprecation-logging"
              title={<h3>Deprecation logging</h3>}
              titleSize="xxs"
              fullWidth
              description={
                <Fragment>
                  Elasticsearch comes with a deprecation logger which will log a message whenever
                  deprecated functionality is used. Enable or disable deprecation logging on your
                  cluster here. This is enabled by default, beginning in Elasticsearch 5.0.
                </Fragment>
              }
            >
              <EuiFormRow
                label="Enable deprecation logging?"
                describedByIds={['deprecation-logging']}
              >
                <DeprecationLoggingToggle />
              </EuiFormRow>
            </EuiDescribedFormGroup>
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }
}
