/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiCallOut, EuiFieldText, EuiFormRow, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SlackActionConnector } from '../types';
import { useKibana } from '../../../../common/lib/kibana';

const SlackActionFields: React.FunctionComponent<
  ActionConnectorFieldsProps<SlackActionConnector>
>> = ({ action, editActionSecrets, errors, readOnly }) => {
  const { docLinks } = useKibana().services;
  const { webhookUrl } = action.secrets;

  return (
    <Fragment>
      <EuiFormRow
        id="webhookUrl"
        fullWidth
        helpText={
          <EuiLink
            href={`${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/slack-action-type.html#configuring-slack`}
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.slackAction.webhookUrlHelpLabel"
              defaultMessage="Create a Slack Webhook URL"
            />
          </EuiLink>
        }
        error={errors.webhookUrl}
        isInvalid={errors.webhookUrl.length > 0 && webhookUrl !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.webhookUrlTextFieldLabel',
          {
            defaultMessage: 'Webhook URL',
          }
        )}
      >
        <Fragment>
          {getEncryptedFieldNotifyLabel(!action.id)}
          <EuiFieldText
            fullWidth
            isInvalid={errors.webhookUrl.length > 0 && webhookUrl !== undefined}
            name="webhookUrl"
            readOnly={readOnly}
            value={webhookUrl || ''}
            data-test-subj="slackWebhookUrlInput"
            onChange={(e) => {
              editActionSecrets('webhookUrl', e.target.value);
            }}
            onBlur={() => {
              if (!webhookUrl) {
                editActionSecrets('webhookUrl', '');
              }
            }}
          />
        </Fragment>
      </EuiFormRow>
    </Fragment>
  );
};

function getEncryptedFieldNotifyLabel(isCreate: boolean) {
  if (isCreate) {
    return (
      <Fragment>
        <EuiSpacer size="s" />
        <EuiText size="s" data-test-subj="rememberValuesMessage">
          <FormattedMessage
            id="xpack.triggersActionsUI.components.builtinActionTypes.slackAction.rememberValueLabel"
            defaultMessage="Remember this value. You must reenter it each time you edit the connector."
          />
        </EuiText>
        <EuiSpacer size="s" />
      </Fragment>
    );
  }
  return (
    <Fragment>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        iconType="iInCircle"
        data-test-subj="reenterValuesMessage"
        title={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.reenterValueLabel',
          { defaultMessage: 'This URL is encrypted. Please reenter a value for this field.' }
        )}
      />
      <EuiSpacer size="m" />
    </Fragment>
  );
}

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
