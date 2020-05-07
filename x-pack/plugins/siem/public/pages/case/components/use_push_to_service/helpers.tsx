/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import * as i18n from './translations';
import { ActionLicense } from '../../../../containers/case/types';

export const getLicenseError = () => ({
  title: i18n.PUSH_DISABLE_BY_LICENSE_TITLE,
  description: (
    <FormattedMessage
      defaultMessage="To open cases in external systems, you must update your license to Platinum, start a free 30-day trial, or spin up a {link} on AWS, GCP, or Azure."
      id="xpack.siem.case.caseView.pushToServiceDisableByLicenseDescription"
      values={{
        link: (
          <EuiLink href="https://www.elastic.co/cloud/" target="_blank">
            {i18n.LINK_CLOUD_DEPLOYMENT}
          </EuiLink>
        ),
      }}
    />
  ),
});

export const getKibanaConfigError = () => ({
  title: i18n.PUSH_DISABLE_BY_KIBANA_CONFIG_TITLE,
  description: (
    <FormattedMessage
      defaultMessage="The kibana.yml file is configured to only allow specific connectors. To enable opening a case in external systems, add .servicenow to the xpack.actions.enabledActiontypes setting. For more information, see {link}."
      id="xpack.siem.case.caseView.pushToServiceDisableByConfigDescription"
      values={{
        link: (
          <EuiLink href="#" target="_blank">
            {'coming soon...'}
          </EuiLink>
        ),
      }}
    />
  ),
});

export const getActionLicenseError = (
  actionLicense: ActionLicense | null
): Array<{ title: string; description: JSX.Element }> => {
  let errors: Array<{ title: string; description: JSX.Element }> = [];
  if (actionLicense != null && !actionLicense.enabledInLicense) {
    errors = [...errors, getLicenseError()];
  }
  if (actionLicense != null && !actionLicense.enabledInConfig) {
    errors = [...errors, getKibanaConfigError()];
  }
  return errors;
};
