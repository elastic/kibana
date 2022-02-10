/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiCallOut, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export const getEncryptedFieldNotifyLabel = (
  isCreate: boolean,
  encryptedFieldsLength: number,
  isMissingSecrets: boolean,
  reEnterDefaultMessage: string
) => {
  if (isMissingSecrets) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut
          size="s"
          color="warning"
          iconType="alert"
          data-test-subj="missingSecretsMessage"
          title={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.missingSecretsValuesLabel',
            {
              defaultMessage:
                'Sensitive information is not imported. Please enter value{encryptedFieldsLength, plural, one {} other {s}} for the following field{encryptedFieldsLength, plural, one {} other {s}}.',
              values: { encryptedFieldsLength },
            }
          )}
        />
        <EuiSpacer size="m" />
      </>
    );
  }
  if (isCreate) {
    return (
      <>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="rememberValuesMessage">
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.rememberValueLabel"
            defaultMessage="Remember {encryptedFieldsLength, plural, one {this} other {these}} value. You must reenter {encryptedFieldsLength, plural, one {it} other {them}} each time you edit the connector."
            values={{ encryptedFieldsLength }}
          />
        </EuiText>
        <EuiSpacer size="s" />
      </>
    );
  }
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={reEnterDefaultMessage}
      />
      <EuiSpacer size="m" />
    </>
  );
};
