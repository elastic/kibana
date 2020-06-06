/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText, EuiFormRow, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';
import { SlackActionConnector } from '../types';

const SlackActionFields: React.FunctionComponent<ActionConnectorFieldsProps<
  SlackActionConnector
>> = ({ action, editActionSecrets, errors }) => {
  const { webhookUrl } = action.secrets;

  return (
    <Fragment>
      <EuiFormRow
        id="webhookUrl"
        fullWidth
        helpText={
          <EuiLink
            href="https://www.elastic.co/guide/en/elasticsearch/reference/current/actions-slack.html#configuring-slack"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.components.builtinActionTypes.slackAction.webhookUrlHelpLabel"
              defaultMessage="Create a Slack webhook URL"
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
        <EuiFieldText
          fullWidth
          isInvalid={errors.webhookUrl.length > 0 && webhookUrl !== undefined}
          name="webhookUrl"
          placeholder="Example: https://hooks.slack.com/services"
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
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackActionFields as default };
