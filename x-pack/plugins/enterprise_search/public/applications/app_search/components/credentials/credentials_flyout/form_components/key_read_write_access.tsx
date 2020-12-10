/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues, useActions } from 'kea';
import { EuiCheckbox, EuiText, EuiTitle, EuiSpacer, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CredentialsLogic } from '../../credentials_logic';
import { TokenReadWrite } from '../../types';

export const FormKeyReadWriteAccess: React.FC = () => {
  const { setTokenReadWrite } = useActions(CredentialsLogic);
  const { activeApiToken } = useValues(CredentialsLogic);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiPanel>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.formReadWrite.label', {
              defaultMessage: 'Read and Write Access Levels',
            })}
          </h3>
        </EuiTitle>
        <EuiText>
          {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.formReadWrite.helpText', {
            defaultMessage: 'Only applies to Private API Keys.',
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCheckbox
          name="read"
          id="read"
          checked={activeApiToken.read}
          onChange={(e) => setTokenReadWrite(e.target as TokenReadWrite)}
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.credentials.formReadWrite.readLabel',
            { defaultMessage: 'Read Access' }
          )}
        />
        <EuiCheckbox
          name="write"
          id="write"
          checked={activeApiToken.write}
          onChange={(e) => setTokenReadWrite(e.target as TokenReadWrite)}
          label={i18n.translate(
            'xpack.enterpriseSearch.appSearch.credentials.formReadWrite.writeLabel',
            { defaultMessage: 'Write Access' }
          )}
        />
      </EuiPanel>
    </>
  );
};
