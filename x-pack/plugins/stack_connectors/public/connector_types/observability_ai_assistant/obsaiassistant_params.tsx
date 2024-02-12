/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { TextAreaWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { ObsAIAssistantActionParams } from '../types';

const ObsAIAssistantParamsFields: React.FunctionComponent<
  ActionParamsProps<ObsAIAssistantActionParams>
> = ({ errors, index, messageVariables }) => {
  const [textValue, setTextValue] = useState<string | undefined>('');

  return (
    <TextAreaWithMessageVariables
      index={index}
      editAction={(_: string, value: any) => {
        setTextValue(value);
      }}
      messageVariables={messageVariables}
      paramsProperty="userMessage"
      inputTargetValue={textValue}
      label={i18n.translate(
        'xpack.stackConnectors.components.obsAIAssistant.messageTextAreaFieldLabel',
        {
          defaultMessage: 'Message',
        }
      )}
      errors={(errors.text ?? []) as string[]}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { ObsAIAssistantParamsFields as default };
