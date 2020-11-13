/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';
import { EuiFlyoutBody, EuiForm } from '@elastic/eui';

import { FlashMessages } from '../../../../shared/flash_messages';
import { CredentialsLogic } from '../credentials_logic';
import { ApiTokenTypes } from '../constants';

import {
  FormKeyName,
  FormKeyType,
  FormKeyReadWriteAccess,
  FormKeyEngineAccess,
  FormKeyUpdateWarning,
} from './form_components';

export const CredentialsFlyoutBody: React.FC = () => {
  const { onApiTokenChange } = useActions(CredentialsLogic);
  const { activeApiToken, activeApiTokenExists } = useValues(CredentialsLogic);

  return (
    <EuiFlyoutBody>
      <FlashMessages />
      <EuiForm
        onSubmit={(e) => {
          e.preventDefault();
          onApiTokenChange();
        }}
        component="form"
      >
        <FormKeyName />
        <FormKeyType />
        {activeApiToken.type === ApiTokenTypes.Private && <FormKeyReadWriteAccess />}
        {activeApiToken.type !== ApiTokenTypes.Admin && <FormKeyEngineAccess />}
      </EuiForm>
      {activeApiTokenExists && <FormKeyUpdateWarning />}
    </EuiFlyoutBody>
  );
};
