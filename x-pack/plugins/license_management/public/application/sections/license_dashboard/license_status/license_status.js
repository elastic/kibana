/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiTextAlign,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class LicenseStatus extends React.PureComponent {
  render() {
    const { isExpired, status, type } = this.props;
    const typeTitleCase = type.charAt(0).toUpperCase() + type.substr(1).toLowerCase();
    let icon;
    let title;
    if (isExpired) {
      icon = <EuiIcon color="danger" type="alert" />;
      title = (
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusTitle"
          defaultMessage="Your {typeTitleCase} license has expired"
          values={{
            typeTitleCase,
          }}
        />
      );
    } else {
      icon = <EuiIcon color="success" type="checkInCircleFilled" size="l" />;
      title = (
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusTitle"
          defaultMessage="Your {typeTitleCase} license is {status}"
          values={{
            typeTitleCase,
            status: status.toLowerCase(),
          }}
        />
      );
    }
    return (
      <EuiTextAlign textAlign="center">
        <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1 data-test-subj="licenseText">{title}</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiTextAlign>
    );
  }
}
