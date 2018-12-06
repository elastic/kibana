/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
  // @ts-ignore
  EuiStat,
  EuiText,
} from '@elastic/eui';

import { LoadingState, UpgradeCheckupTabComponent } from '../../types';
import { Steps } from './steps';

export class OverviewTab extends UpgradeCheckupTabComponent {
  public render() {
    return (
      <Fragment>
        <EuiSpacer />

        <EuiText grow={false}>
          <p>
            This assistant checks your cluster and indices and identifies the changes you need to
            make before upgrading to Elasticsearch 7.0.
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiCallOut title="Issues list might be incomplete" color="warning" iconType="help">
          <p>
            The complete list of{' '}
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-7.0.html"
              target="_blank"
            >
              deprecations and breaking changes
            </EuiLink>{' '}
            in Elasticsearch 7.0 will be available in the final 6.x minor release. When this list is
            complete, this warning will go away.
          </p>
        </EuiCallOut>

        <EuiSpacer />

        <EuiPageContent>
          <EuiPageContentBody>
            {this.props.loadingState === LoadingState.Success ? (
              <Steps {...this.props} />
            ) : (
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }
}
