/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  isEdit: boolean;
  isMissingSecrets?: boolean | undefined;
}

const Callout: React.FC<{ title: string }> = ({ title }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={title}
      />
      <EuiSpacer size="m" />
    </>
  );
};

const EncryptedFieldsCalloutComponent: React.FC<Props> = ({ isEdit, isMissingSecrets }) => {
  if (isMissingSecrets) {
    return (
      <Callout
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.missingSecretsValuesLabel',
          {
            defaultMessage:
              'Sensitive information is not imported. Please enter value(s) for the following field(s).',
          }
        )}
      />
    );
  }

  if (!isEdit) {
    return (
      <Callout
        title={i18n.translate(
          'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.reenterValuesLabel',
          {
            defaultMessage:
              'Remember the sensitive values. You must reenter them each time you edit the connector.',
          }
        )}
      />
    );
  }

  if (isEdit) {
    return (
      <Callout
        title={i18n.translate(
          'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.missingSecretsValuesLabel',
          {
            defaultMessage:
              'Sensitive values are encrypted. Please reenter values for these fields.',
          }
        )}
      />
    );
  }

  return null;
};

export const EncryptedFieldsCallout = memo(EncryptedFieldsCalloutComponent);
