/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BASE_PATH } from '../../../../common/constants';

import { EuiCard, EuiButton } from '@elastic/eui';

export const AddLicense = ({ uploadPath = `#${BASE_PATH}upload_license` }) => {
  return (
    <EuiCard
      title="Update your license"
      description="If you already have a new license, upload it now."
      footer={
        <EuiButton
          data-test-subj="updateLicenseButton"
          className="licenseManagement__marginTop"
          href={uploadPath}
        >
          Update license
        </EuiButton>
      }
    />
  );
};
