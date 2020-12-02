/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';
import { EuiFormRow, EuiSelect, EuiText, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AppLogic } from '../../../../app_logic';
import { CredentialsLogic } from '../../credentials_logic';
import { TOKEN_TYPE_DESCRIPTION, TOKEN_TYPE_INFO, DOCS_HREF } from '../../constants';

export const FormKeyType: React.FC = () => {
  const { myRole } = useValues(AppLogic);
  const { setTokenType } = useActions(CredentialsLogic);
  const { activeApiToken, activeApiTokenExists } = useValues(CredentialsLogic);

  const tokenDescription = TOKEN_TYPE_DESCRIPTION[activeApiToken.type];
  const tokenOptions = TOKEN_TYPE_INFO.filter((typeInfo) =>
    myRole?.credentialTypes?.includes(typeInfo.value)
  );

  return (
    <EuiFormRow
      label={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.formType.label', {
        defaultMessage: 'Key type',
      })}
      fullWidth
      helpText={
        <EuiText size="xs">
          <p>
            <strong>{tokenDescription}</strong>{' '}
            <EuiLink href={DOCS_HREF}>
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.documentationLink1', {
                defaultMessage: 'Visit the documentation',
              })}
            </EuiLink>{' '}
            {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.documentationLink2', {
              defaultMessage: 'to learn more about keys.',
            })}
          </p>
        </EuiText>
      }
    >
      <EuiSelect
        name="token_type"
        options={tokenOptions}
        value={activeApiToken.type}
        onChange={(e) => setTokenType(e.target.value)}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.appSearch.credentials.formType.placeholder',
          { defaultMessage: 'Select a key type' }
        )}
        disabled={activeApiTokenExists}
        required
        fullWidth
      />
    </EuiFormRow>
  );
};
