/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions } from 'kea';
import { EuiPortal, EuiFlyout } from '@elastic/eui';

import { CredentialsLogic } from '../credentials_logic';
import { FLYOUT_ARIA_LABEL_ID } from '../constants';
import { CredentialsFlyoutHeader } from './header';
import { CredentialsFlyoutBody } from './body';
import { CredentialsFlyoutFooter } from './footer';

export const CredentialsFlyout: React.FC = () => {
  const { hideCredentialsForm } = useActions(CredentialsLogic);

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={hideCredentialsForm}
        hideCloseButton={true}
        ownFocus={true}
        aria-labelledby={FLYOUT_ARIA_LABEL_ID}
        size="s"
      >
        <CredentialsFlyoutHeader />
        <CredentialsFlyoutBody />
        <CredentialsFlyoutFooter />
      </EuiFlyout>
    </EuiPortal>
  );
};
