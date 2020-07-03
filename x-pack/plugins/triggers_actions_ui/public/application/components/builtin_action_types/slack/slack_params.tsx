/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { SlackActionParams } from '../types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';

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

  return (
    <TextAreaWithMessageVariables
      index={index}
      editAction={editAction}
      messageVariables={messageVariables}
      paramsProperty={'message'}
      inputTargetValue={message}
      label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.messageTextAreaFieldLabel',
        {
          defaultMessage: 'Message',
        }
      )}
      errors={errors.message as string[]}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };
