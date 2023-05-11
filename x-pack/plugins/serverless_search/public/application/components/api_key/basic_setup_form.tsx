/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface BasicSetupFormProps {
  isLoading: boolean;
  name: string;
  user: string;
  expires: string;
  onChangeName: (name: string) => void;
  onChangeExpires: (expires: string) => void;
}

export const BasicSetupForm: React.FC<BasicSetupFormProps> = ({
  isLoading,
  name,
  user,
  expires,
  onChangeName,
  onChangeExpires,
}) => {
  return (
    <EuiForm>
      <EuiFormRow
        isInvalid={!name}
        helpText={i18n.translate('xpack.serverlessSearch.apiKey.nameFieldHelpText', {
          defaultMessage: 'A good name makes it clear what your API key does.',
        })}
        label={i18n.translate('xpack.serverlessSearch.apiKey.nameFieldLabel', {
          defaultMessage: 'Name',
        })}
      >
        <EuiFieldText
          isLoading={isLoading}
          value={name}
          onChange={(e) => onChangeName(e.currentTarget.value)}
        />
      </EuiFormRow>
      <EuiFormRow
        helpText={i18n.translate('xpack.serverlessSearch.apiKey.userFieldHelpText', {
          defaultMessage: 'ID of the user creating the API key.',
        })}
        label={i18n.translate('xpack.serverlessSearch.apiKey.userFieldLabel', {
          defaultMessage: 'User',
        })}
      >
        <EuiFieldText
          disabled={true}
          placeholder="3058000678"
          value={user}
          onChange={(e) => onChangeName(e.currentTarget.value)}
        />
      </EuiFormRow>
      <EuiFormRow
        helpText={i18n.translate('xpack.serverlessSearch.apiKey.expiresFieldHelpText', {
          defaultMessage: 'API keys should be rotated regularly.',
        })}
        label={i18n.translate('xpack.serverlessSearch.apiKey.expiresFieldLabel', {
          defaultMessage: 'Expires',
        })}
      >
        <EuiFieldText
          disabled={isLoading}
          placeholder="1d"
          value={expires}
          onChange={(e) => onChangeExpires(e.currentTarget.value)}
        />
      </EuiFormRow>
    </EuiForm>
  );
};
