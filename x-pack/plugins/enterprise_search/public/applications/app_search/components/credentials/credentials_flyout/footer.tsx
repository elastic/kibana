/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
import { i18n } from '@kbn/i18n';

import { CredentialsLogic } from '../credentials_logic';

export const CredentialsFlyoutFooter: React.FC = () => {
  const { hideCredentialsForm, onApiTokenChange } = useActions(CredentialsLogic);
  const { activeApiTokenExists } = useValues(CredentialsLogic);

  return (
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
            onClick={onApiTokenChange}
            fill={true}
            color="secondary"
            iconType="check"
            data-test-subj="APIKeyActionButton"
          >
            {activeApiTokenExists
              ? i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.updateText', {
                  defaultMessage: 'Update',
                })
              : i18n.translate('xpack.enterpriseSearch.appSearch.credentials.flyout.saveText', {
                  defaultMessage: 'Save',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
};
