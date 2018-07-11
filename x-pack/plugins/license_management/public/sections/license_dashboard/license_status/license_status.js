/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export class LicenseStatus extends React.PureComponent {
  render() {
    const { isExpired, status, type, expiryDate } = this.props;
    let icon;
    let title;
    let message;
    if (isExpired) {
      icon = <EuiIcon color="danger" type="alert" />;
      message = (
        <Fragment>
          Your license expired on <strong>{expiryDate}</strong>
        </Fragment>
      );
      title = `Your ${type} license has expired`;
    } else {
      icon = <EuiIcon color="success" type="checkInCircleFilled" />;
      message = expiryDate ? (
        <Fragment>
          Your license will expire on <strong>{expiryDate}</strong>
        </Fragment>
      ) : (
        <Fragment>Your license will never expire.</Fragment>
      );
      title = `Your ${type} license is ${status.toLowerCase()}`;
    }
    return (
      <div>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h2 data-test-subj="licenseText">{title}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <span data-test-subj="licenseSubText">
              <EuiText color="subdued">{message}</EuiText>
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
      </div>
    );
  }
}
