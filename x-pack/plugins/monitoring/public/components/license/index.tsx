/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FunctionComponent } from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiCodeBlock,
  EuiPanel,
  EuiText,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiCard,
  EuiButton,
  EuiIcon,
  EuiTitle,
  EuiTextAlign,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { Legacy } from '../../legacy_shims';

interface AddLicenseProps {
  uploadPath?: string;
}
const AddLicense: FunctionComponent<AddLicenseProps> = ({ uploadPath }) => {
  return (
    <EuiCard
      title={
        <FormattedMessage
          id="xpack.monitoring.updateLicenseTitle"
          defaultMessage="Update your license"
        />
      }
      description={
        <FormattedMessage
          id="xpack.monitoring.useAvailableLicenseDescription"
          defaultMessage="If you already have a new license, upload it now."
        />
      }
      footer={
        <EuiButton data-test-subj="updateLicenseButton" href={uploadPath}>
          <FormattedMessage
            id="xpack.monitoring.updateLicenseButtonLabel"
            defaultMessage="Update license"
          />
        </EuiButton>
      }
    />
  );
};

export interface LicenseStatusProps {
  isExpired: boolean;
  status: string;
  type: string;
  expiryDate: string | Date;
}

class LicenseStatus extends React.PureComponent<LicenseStatusProps> {
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
            id="xpack.monitoring.expiredLicenseStatusDescription"
            defaultMessage="Your license expired on {expiryDate}"
            values={{
              expiryDate: <strong>{expiryDate}</strong>,
            }}
          />
        </Fragment>
      );
      title = (
        <FormattedMessage
          id="xpack.monitoring.expiredLicenseStatusTitle"
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
            id="xpack.monitoring.activeLicenseStatusDescription"
            defaultMessage="Your license will expire on {expiryDate}"
            values={{
              expiryDate: <strong>{expiryDate}</strong>,
            }}
          />
        </Fragment>
      ) : (
        <Fragment>
          <FormattedMessage
            id="xpack.monitoring.permanentActiveLicenseStatusDescription"
            defaultMessage="Your license will never expire."
          />
        </Fragment>
      );
      title = (
        <FormattedMessage
          id="xpack.monitoring.activeLicenseStatusTitle"
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

export interface LicenseUpdateInfoProps {
  isPrimaryCluster: boolean;
  uploadLicensePath?: string;
}

const LicenseUpdateInfoForPrimary: FunctionComponent<LicenseUpdateInfoProps> = ({
  isPrimaryCluster,
  uploadLicensePath,
}) => {
  if (!isPrimaryCluster) {
    return null;
  }

  // viewed license is for the cluster directly connected to Kibana
  return <AddLicense uploadPath={uploadLicensePath} />;
};

const LicenseUpdateInfoForRemote: FunctionComponent<LicenseUpdateInfoProps> = ({
  isPrimaryCluster,
}) => {
  if (isPrimaryCluster) {
    return null;
  }

  // viewed license is for a remote monitored cluster not directly connected to Kibana
  return (
    <EuiPanel>
      <p>
        <FormattedMessage
          id="xpack.monitoring.license.howToUpdateLicenseDescription"
          defaultMessage="To update the license for this cluster, provide the license file through
          the Elasticsearch {apiText}:"
          values={{
            apiText: 'API',
          }}
        />
      </p>
      <EuiSpacer />
      <EuiCodeBlock>
        {`curl -XPUT -u <user> 'https://<host>:<port>/_license' -H 'Content-Type: application/json' -d @license.json`}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

export interface LicenseProps extends LicenseStatusProps, LicenseUpdateInfoProps {}
export const License: FunctionComponent<LicenseProps> = (props) => {
  const { status, type, isExpired, expiryDate } = props;
  const licenseManagement = `${Legacy.shims.getBasePath()}/app/management/stack/license_management`;
  return (
    <EuiPage>
      <EuiScreenReaderOnly>
        <h1>
          <FormattedMessage id="xpack.monitoring.license.heading" defaultMessage="License" />
        </h1>
      </EuiScreenReaderOnly>
      <EuiPageBody>
        <LicenseStatus isExpired={isExpired} status={status} type={type} expiryDate={expiryDate} />
        <EuiSpacer />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <LicenseUpdateInfoForPrimary {...props} />
            <LicenseUpdateInfoForRemote {...props} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer />
        <EuiText size="s" textAlign="center">
          <p>
            For more license options please visit&nbsp;
            <EuiLink href={licenseManagement}>License Management</EuiLink>.
          </p>
        </EuiText>
      </EuiPageBody>
    </EuiPage>
  );
};
