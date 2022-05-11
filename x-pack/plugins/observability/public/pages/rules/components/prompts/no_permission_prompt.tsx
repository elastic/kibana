/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';

export function NoPermissionPrompt() {
  return (
    <EuiPageTemplate
      template="centeredContent"
      pageContentProps={{
        paddingSize: 'none',
        role: null, // For passing a11y tests in EUI docs only
      }}
    >
      <EuiEmptyPrompt
        data-test-subj="noPermissionPrompt"
        color="plain"
        hasBorder={true}
        iconType="securityApp"
        title={
          <h1>
            <FormattedMessage
              id="xpack.observability.rules.noPermissionToCreateTitle"
              defaultMessage="No permissions to create rules"
            />
          </h1>
        }
        body={
          <p data-test-subj="permissionDeniedMessage">
            <FormattedMessage
              id="xpack.observability.rules.noPermissionToCreateDescription"
              defaultMessage="Contact your system administrator."
            />
          </p>
        }
      />
    </EuiPageTemplate>
  );
}
