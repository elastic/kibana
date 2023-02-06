/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { SlackActionParams } from '../types';

const SlackParamsFields: React.FunctionComponent<ActionParamsProps<SlackActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}) => {
  const { message } = actionParams;
  const [[isUsingDefault, defaultMessageUsed], setDefaultMessageUsage] = useState<
    [boolean, string | undefined]
  >([false, defaultMessage]);
  useEffect(() => {
    if (
      !actionParams?.message ||
      (isUsingDefault &&
        actionParams?.message === defaultMessageUsed &&
        defaultMessageUsed !== defaultMessage)
    ) {
      setDefaultMessageUsage([true, defaultMessage]);
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage]);

  return (
    <TextAreaWithMessageVariables
      index={index}
      editAction={editAction}
      messageVariables={messageVariables}
      paramsProperty={'message'}
      inputTargetValue={message}
      label={i18n.translate('xpack.stackConnectors.components.slack.messageTextAreaFieldLabel', {
        defaultMessage: 'Message',
      })}
      errors={(errors.message ?? []) as string[]}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { SlackParamsFields as default };
