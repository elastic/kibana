/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiCard, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useAppContext } from '../../../app_context';

import { reactRouterNavigate } from '../../../../../../../../src/plugins/kibana_react/public';

export const AddLicense = ({ uploadPath = `/upload_license` }) => {
  const { services } = useAppContext();

  return (
    <EuiCard
      title={
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.addLicense.updateLicenseTitle"
          defaultMessage="Update your license"
        />
      }
      description={
        <FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.addLicense.useAvailableLicenseDescription"
          defaultMessage="If you already have a new license, upload it now."
        />
      }
      footer={
        <EuiButton
          data-test-subj="updateLicenseButton"
          {...reactRouterNavigate(services.history, uploadPath)}
        >
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.addLicense.updateLicenseButtonLabel"
            defaultMessage="Update license"
          />
        </EuiButton>
      }
    />
  );
};
