/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useActions, useValues } from 'kea';
import { i18n } from '@kbn/i18n';
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
  EuiPortal,
} from '@elastic/eui';

import {
  CredentialsLogic,
  ICredentialsLogicActions,
  ICredentialsLogicValues,
} from './credentials_logic';

const CredentialsFlyout: React.FC = () => {
  const { hideCredentialsForm } = useActions(CredentialsLogic) as ICredentialsLogicActions;

  const getUpdateTitle = (tokenName: string) =>
    i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.updateTitle', {
      defaultMessage: 'Update {tokenName}',
      values: { tokenName },
    });
  const getCreateTitle = () =>
    i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.createTitle', {
      defaultMessage: 'Create a new key',
    });
  const getSaveText = () =>
    i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.saveText', {
      defaultMessage: 'Save',
    });
  const getUpdateText = () =>
    i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.updateText', {
      defaultMessage: 'Update',
    });

  const { activeApiToken, activeApiTokenExists } = useValues(
    CredentialsLogic
  ) as ICredentialsLogicValues;

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={hideCredentialsForm}
        hideCloseButton={true}
        ownFocus={true}
        aria-labelledby="credentialsFlyoutTitle"
        size="s"
      >
        <EuiFlyoutHeader hasBorder={true}>
          <EuiTitle size="m">
            <h2 id="credentialsFlyoutTitle">
              {activeApiToken.id ? getUpdateTitle(activeApiToken.name) : getCreateTitle()}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody style={{ display: 'flex' }}>Details go here</EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={hideCredentialsForm}>
                {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.closeText', {
                  defaultMessage: 'Close',
                })}
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
                {activeApiTokenExists ? getUpdateText() : getSaveText()}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};

export { CredentialsFlyout };
