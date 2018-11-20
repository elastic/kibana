/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
<<<<<<< HEAD
=======
import { FormattedMessage } from '@kbn/i18n/react';
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
import React from 'react';

export const UnauthorizedPrompt = () => (
  <EuiEmptyPrompt
    iconType="spacesApp"
    iconColor={'danger'}
<<<<<<< HEAD
    title={<h2>Permission denied</h2>}
    body={
      <p data-test-subj="permissionDeniedMessage">You do not have permission to manage spaces.</p>
=======
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
          defaultMessage="You do not have permission to manage spaces."
        />
      </p>
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    }
  />
);
