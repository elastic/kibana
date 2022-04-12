/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { WebhookActionParams } from '../types';
import { JsonEditorWithMessageVariables } from '../../json_editor_with_message_variables';

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps<WebhookActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { body } = actionParams;
  return (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'body'}
      inputTargetValue={body}
      label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyFieldLabel',
        {
          defaultMessage: 'Body',
        }
      )}
      aria-label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.bodyCodeEditorAriaLabel',
        {
          defaultMessage: 'Code editor',
        }
      )}
      errors={errors.body as string[]}
      onDocumentsChange={(json: string) => {
        editAction('body', json, index);
      }}
      onBlur={() => {
        if (!body) {
          editAction('body', '', index);
        }
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookParamsFields as default };
