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
  EuiTextAlign,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export class LicenseStatus extends React.PureComponent {
  render() {
    const { isExpired, status, type, expiryDate } = this.props;
    const typeTitleCase = type.charAt(0).toUpperCase() + type.substr(1).toLowerCase();
    let icon;
    let title;
    let message;
    if (isExpired) {
      icon = <EuiIcon color="danger" type="alert" />;
      message = (
        <Fragment>
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.licenseStatus.expiredLicenseStatusDescription"
            defaultMessage="Your license expired on {expiryDate}"
            values={{
              expiryDate: <strong>{expiryDate}</strong>,
            }}
          />
        </Fragment>
      );
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
      message = expiryDate ? (
        <Fragment>
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.licenseStatus.activeLicenseStatusDescription"
            defaultMessage="Your license will expire on {expiryDate}"
            values={{
              expiryDate: <strong>{expiryDate}</strong>,
            }}
          />
        </Fragment>
      ) : (
        <Fragment>
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.licenseStatus.permanentActiveLicenseStatusDescription"
            defaultMessage="Your license will never expire."
          />
        </Fragment>
      );
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

        <EuiSpacer />

        <EuiText data-test-subj="licenseSubText">{message}</EuiText>
      </EuiTextAlign>
    );
  }
}
