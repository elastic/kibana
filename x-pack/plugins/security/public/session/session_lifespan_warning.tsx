/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiProgress } from '@elastic/eui';

export const SessionLifespanWarning = () => {
  return (
    <>
      <EuiProgress size="xs" color="danger" position="absolute" />
      <p>
        <FormattedMessage
          id="xpack.security.components.sessionLifespanWarning.message"
          defaultMessage="Your session will soon reach the maximum time limit. You will need to log in again."
        />
      </p>
    </>
  );
};
