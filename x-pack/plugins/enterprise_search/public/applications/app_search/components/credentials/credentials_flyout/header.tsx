/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
import { EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CredentialsLogic } from '../credentials_logic';
import { FLYOUT_ARIA_LABEL_ID } from '../constants';

export const CredentialsFlyoutHeader: React.FC = () => {
  const { activeApiToken } = useValues(CredentialsLogic);

  return (
    <EuiFlyoutHeader hasBorder={true}>
      <EuiTitle size="m">
        <h2 id={FLYOUT_ARIA_LABEL_ID}>
          {activeApiToken.id
            ? i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.updateTitle', {
                defaultMessage: 'Update {tokenName}',
                values: { tokenName: activeApiToken.name },
              })
            : i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.createTitle', {
                defaultMessage: 'Create a new key',
              })}
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );
};
