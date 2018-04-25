/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiPage,
  EuiPageBody,
  EuiSpacer,
  EuiCodeBlock,
  EuiPanel
} from '@elastic/eui';
import { LicenseStatus, AddLicense } from 'plugins/xpack_main/components';

const LicenseUpdateInfoForPrimary = ({ isPrimaryCluster, uploadLicensePath }) => {
  if (!isPrimaryCluster) {
    return null;
  }

  // viewed license is for the cluster directly connnected to Kibana
  return <AddLicense uploadPath={uploadLicensePath} />;
};

const LicenseUpdateInfoForRemote = ({ isPrimaryCluster }) => {
  if (isPrimaryCluster) {
    return null;
  }

  // viewed license is for a remote monitored cluster not directly connected to Kibana
  return (
    <EuiPanel>
      <p>
        To update the license for this cluster, provide the license file through
        the Elasticsearch API:
      </p>
      <EuiSpacer />
      <EuiCodeBlock>
        {`curl -XPUT -u <user> 'https://<host>:<port>/_xpack/license' -H 'Content-Type: application/json' -d @license.json`}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

export function License(props) {
  const { status, type, isExpired, expiryDate } = props;
  return (
    <EuiPage className="licenseManagement">
      <EuiPageBody className="licenseManagement__pageBody">
        <div className="licenseManagement__contain">
          <LicenseStatus
            isExpired={isExpired}
            status={status}
            type={type}
            expiryDate={expiryDate}
          />

          <EuiSpacer size="l" />

          <LicenseUpdateInfoForPrimary {...props} />
          <LicenseUpdateInfoForRemote {...props} />
        </div>
      </EuiPageBody>
    </EuiPage>
  );
}
