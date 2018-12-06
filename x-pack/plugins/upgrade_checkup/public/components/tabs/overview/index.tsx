/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  // @ts-ignore
  EuiDescribedFormGroup,
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
            This assistant helps you prepare for your upgrade from{' '}
            <strong>Elasticsearch 6.x</strong> to <strong>Elasticsearch 7.x</strong>. Read more
            about important changes in the{' '}
            <EuiLink
              href="https://www.elastic.co/guide/en/elasticsearch/reference/master/breaking-changes-7.0.html"
              target="_blank"
            >
              Breaking Changes
            </EuiLink>{' '}
            documentation online.
          </p>
        </EuiText>

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
