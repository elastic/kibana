/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

export const UnauthorizedPrompt = () => (
  <EuiEmptyPrompt
    iconType="spacesApp"
    iconColor={'danger'}
    title={
      <h2>
        <FormattedMessage
          id="xpack.spaces.management.unauthorizedPrompt.permissionDeniedTitle"
          defaultMessage="Permission denied"
        />
      </h2>
    }
    body={
      <p data-test-subj="permissionDeniedMessage">
        <FormattedMessage
          id="xpack.spaces.management.unauthorizedPrompt.permissionDeniedDescription"
          defaultMessage="You don't have permission to manage spaces."
        />
      </p>
    }
  />
);
