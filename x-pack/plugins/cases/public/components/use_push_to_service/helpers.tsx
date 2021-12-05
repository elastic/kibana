/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import * as i18n from './translations';
import { ActionLicense } from '../../containers/types';
import { CLOSED_CASE_PUSH_ERROR_ID, ErrorMessage } from './callout/types';

export const getLicenseError = () => ({
  id: 'license-error',
  title: '',
  description: (
    <FormattedMessage
      defaultMessage="Opening cases in external systems is available when you have the {appropriateLicense}, are using a {cloud}, or are testing out a Free Trial."
      id="xpack.cases.caseView.pushToServiceDisableByLicenseDescription"
      values={{
        appropriateLicense: (
          <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
            {i18n.LINK_APPROPRIATE_LICENSE}
          </EuiLink>
        ),
        cloud: (
          <EuiLink href="https://www.elastic.co/cloud/elasticsearch-service/signup" target="_blank">
            {i18n.LINK_CLOUD_DEPLOYMENT}
          </EuiLink>
        ),
      }}
    />
  ),
});

export const getKibanaConfigError = () => ({
  id: 'kibana-config-error',
  title: i18n.PUSH_DISABLE_BY_KIBANA_CONFIG_TITLE,
  description: (
    <FormattedMessage
      defaultMessage="The kibana.yml file is configured to only allow specific connectors. To enable opening a case in external systems, add .[actionTypeId] (ex: .servicenow | .jira)  to the xpack.actions.enabledActiontypes setting. For more information, see {link}."
      id="xpack.cases.caseView.pushToServiceDisableByConfigDescription"
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

export const getActionLicenseError = (actionLicense: ActionLicense | null): ErrorMessage[] => {
  let errors: ErrorMessage[] = [];
  if (actionLicense != null && !actionLicense.enabledInLicense) {
    errors = [...errors, getLicenseError()];
  }
  if (actionLicense != null && !actionLicense.enabledInConfig) {
    errors = [...errors, getKibanaConfigError()];
  }
  return errors;
};

export const getConnectorMissingInfo = () => ({
  id: 'connector-missing-error',
  title: '',
  description: i18n.CONFIGURE_CONNECTOR,
});

export const getDeletedConnectorError = () => ({
  id: 'connector-deleted-error',
  title: '',
  description: (
    <FormattedMessage
      defaultMessage="The connector used to send updates to the external service has been deleted or you do not have the {appropriateLicense} to use it. To update cases in external systems, select a different connector or create a new one."
      id="xpack.cases.configureCases.warningMessage"
      values={{
        appropriateLicense: (
          <EuiLink href="https://www.elastic.co/subscriptions" target="_blank">
            {i18n.LINK_APPROPRIATE_LICENSE}
          </EuiLink>
        ),
      }}
    />
  ),
  errorType: 'danger',
});

export const getCaseClosedInfo = () => ({
  id: CLOSED_CASE_PUSH_ERROR_ID,
  title: '',
  description: (
    <FormattedMessage
      defaultMessage="Closed cases cannot be sent to external systems. Reopen the case if you want to open or update it in an external system."
      id="xpack.cases.caseView.pushToServiceDisableBecauseCaseClosedDescription"
    />
  ),
});
