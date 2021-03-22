/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';

import { CLOSE, SAVE, UPDATE } from '../../../../shared/constants';

import { CredentialsLogic } from '../credentials_logic';

export const CredentialsFlyoutFooter: React.FC = () => {
  const { hideCredentialsForm, onApiTokenChange } = useActions(CredentialsLogic);
  const { activeApiTokenExists } = useValues(CredentialsLogic);

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={hideCredentialsForm}>
            {CLOSE}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={onApiTokenChange}
            fill
            color="secondary"
            iconType="check"
            data-test-subj="APIKeyActionButton"
          >
            {activeApiTokenExists ? UPDATE : SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
