/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlyoutBody } from '@elastic/eui';

import { FlashMessages } from '../../../../shared/flash_messages';

export const CredentialsFlyoutBody: React.FC = () => {
  return (
    <EuiFlyoutBody>
      <FlashMessages />
      Details go here
    </EuiFlyoutBody>
  );
};
