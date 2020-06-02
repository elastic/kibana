/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect } from 'react';
import { EuiTextArea, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { SlackActionParams } from '../types';
import { AddMessageVariables } from '../../add_message_variables';

const SlackParamsFields: React.FunctionComponent<ActionParamsProps<SlackActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}) => {
  const { message } = actionParams;
  useEffect(() => {
    if (!message && defaultMessage && defaultMessage.length > 0) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectMessageVariable = (paramsProperty: string, variable: string) => {
    editAction(paramsProperty, (message ?? '').concat(` {{${variable}}}`), index);
  };

  return (
    <Fragment>
      <EuiFormRow
        id="slackMessage"
        fullWidth
        error={errors.message}
        isInvalid={errors.message.length > 0 && message !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) =>
              onSelectMessageVariable('message', variable)
            }
            paramsProperty="message"
          />
        }
      >
        <EuiTextArea
          fullWidth
          isInvalid={errors.message.length > 0 && message !== undefined}
          name="message"
          value={message || ''}
          data-test-subj="slackMessageTextArea"
          onChange={(e) => {
            editAction('message', e.target.value, index);
          }}
          onBlur={() => {
            if (!message) {
              editAction('message', '', index);
            }
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };
