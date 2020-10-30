/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';
import { EuiFormRow, EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CredentialsLogic } from '../../credentials_logic';

export const FormKeyName: React.FC = () => {
  const { setNameInputBlurred, setTokenName } = useActions(CredentialsLogic);
  const {
    activeApiToken: { name },
    activeApiTokenRawName: rawName,
    activeApiTokenExists,
  } = useValues(CredentialsLogic);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.formName.label', {
        defaultMessage: 'Key name',
      })}
      helpText={
        !!name && name !== rawName
          ? i18n.translate('xpack.enterpriseSearch.appSearch.credentials.formName.helpText', {
              defaultMessage: 'Your key will be named: {name}',
              values: { name },
            })
          : ''
      }
      fullWidth
    >
      <EuiFieldText
        name="raw_name"
        id="raw_name"
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.credentials.formName.placeholder',
          { defaultMessage: 'i.e., my-engine-key' }
        )}
        data-test-subj="APIKeyField"
        value={rawName}
        onChange={(e) => setTokenName(e.target.value)}
        onBlur={() => setNameInputBlurred(true)}
        autoComplete="off"
        maxLength={64}
        disabled={activeApiTokenExists}
        required
        fullWidth
        autoFocus
      />
    </EuiFormRow>
  );
};
