/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions, useValues } from 'kea';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';

import {
  CredentialsLogic,
  ICredentialsLogicActions,
  ICredentialsLogicValues,
} from './credentials_logic';

const CredentialsFlyout: React.FC = () => {
  const { hideCredentialsForm } = useActions(CredentialsLogic) as ICredentialsLogicActions;

  const { activeApiToken, activeApiTokenIsExisting } = useValues(
    CredentialsLogic
  ) as ICredentialsLogicValues;

  return (
    <EuiFlyout
      onClose={hideCredentialsForm}
      hideCloseButton={true}
      // ownFocus={true}
      aria-labelledby="credentialsFlyoutTitle"
      size="s"
    >
      <EuiFlyoutHeader hasBorder={true}>
        <EuiTitle size="m">
          <h2 id="credentialsFlyoutTitle">
            {activeApiToken.id ? `Update ${activeApiToken.name}` : 'Create A New Key'}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody style={{ display: 'flex' }}>Details go here</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={hideCredentialsForm}>
              Close
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={() => window.alert(`submit`)}
              fill={true}
              color="secondary"
              iconType="check"
              data-test-subj="APIKeyActionButton"
            >
              {activeApiTokenIsExisting ? 'Update' : 'Save'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export { CredentialsFlyout };
