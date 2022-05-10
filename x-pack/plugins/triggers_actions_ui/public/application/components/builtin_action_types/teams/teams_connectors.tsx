/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FieldConfig, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { DocLinksStart } from '@kbn/core/public';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { ActionConnectorFieldsProps } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';

const { emptyField } = fieldValidators;

const getWebhookUrlConfig = (docLinks: DocLinksStart): FieldConfig => ({
  label: i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.webhookUrlTextFieldLabel',
    {
      defaultMessage: 'Webhook URL',
    }
  ),
  helpText: (
    <EuiLink href={docLinks.links.alerting.teamsAction} target="_blank">
      <FormattedMessage
        id="xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.webhookUrlHelpLabel"
        defaultMessage="Create a Microsoft Teams Webhook URL"
      />
    </EuiLink>
  ),
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.webhookUrlTextFieldLabel',
          {
            defaultMessage: 'Webhook URL',
          }
        )
      ),
    },
  ],
});

const TeamsActionFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  const { docLinks } = useKibana().services;

  return (
    <>
      {getEncryptedFieldNotifyLabel(
        !isEdit,
        1,
        // TODO: Get isMissingSecrets
        false,
        i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.reenterValueLabel',
          { defaultMessage: 'This URL is encrypted. Please reenter a value for this field.' }
        )
      )}
      <UseField
        path="secrets.webhookUrl"
        config={getWebhookUrlConfig(docLinks)}
        component={Field}
        componentProps={{
          euiFieldProps: {
            readOnly,
            'data-test-subj': 'teamsWebhookUrlInput',
            fullWidth: true,
          },
        }}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TeamsActionFields as default };
