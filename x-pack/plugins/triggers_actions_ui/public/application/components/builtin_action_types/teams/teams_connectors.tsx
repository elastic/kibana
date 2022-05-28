/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { TeamsActionConnector } from '../types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const TeamsActionFields: React.FunctionComponent<
  ActionConnectorFieldsProps<TeamsActionConnector>
> = ({ action, editActionSecrets, errors, readOnly }) => {
  const { webhookUrl } = action.secrets;
  const { docLinks } = useKibana().services;

  const isWebhookUrlInvalid: boolean =
    errors.webhookUrl !== undefined && errors.webhookUrl.length > 0 && webhookUrl !== undefined;

  return (
    <>
      <EuiFormRow
        id="webhookUrl"
        fullWidth
        helpText={
          <EuiLink href={docLinks.links.alerting.teamsAction} target="_blank">
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.webhookUrlHelpLabel"
              defaultMessage="Create a Microsoft Teams Webhook URL"
            />
          </EuiLink>
        }
        error={errors.webhookUrl}
        isInvalid={isWebhookUrlInvalid}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.webhookUrlTextFieldLabel',
          {
            defaultMessage: 'Webhook URL',
          }
        )}
      >
        <>
          {getEncryptedFieldNotifyLabel(
            !action.id,
            1,
            action.isMissingSecrets ?? false,
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.reenterValueLabel',
              { defaultMessage: 'This URL is encrypted. Please reenter a value for this field.' }
            )
          )}
          <EuiFieldText
            fullWidth
            isInvalid={isWebhookUrlInvalid}
            name="webhookUrl"
            readOnly={readOnly}
            value={webhookUrl || ''}
            data-test-subj="teamsWebhookUrlInput"
            onChange={(e) => {
              editActionSecrets('webhookUrl', e.target.value);
            }}
            onBlur={() => {
              if (!webhookUrl) {
                editActionSecrets('webhookUrl', '');
              }
            }}
          />
        </>
      </EuiFormRow>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TeamsActionFields as default };
