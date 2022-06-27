/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';

export const AccessDeniedPage = () => (
  <>
    <EuiPageContent
      verticalPosition="center"
      horizontalPosition="center"
      color="danger"
      data-test-subj="mlPageAccessDenied"
    >
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ml.management.jobsList.noPermissionToAccessLabel"
              defaultMessage="Access denied"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ml.management.jobsList.noGrantedPrivilegesDescription"
              defaultMessage="You don’t have permission to manage Machine Learning jobs. Access to the plugin requires the Machine Learning feature to be visible in this space."
            />
          </p>
        }
      />
    </EuiPageContent>
  </>
);
