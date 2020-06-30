/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFormRow, EuiCodeEditor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { WebhookActionParams } from '../types';
import { AddMessageVariables } from '../../add_message_variables';

const WebhookParamsFields: React.FunctionComponent<ActionParamsProps<WebhookActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  const { body } = actionParams;
  const onSelectMessageVariable = (paramsProperty: string, variable: string) => {
    editAction(paramsProperty, (body ?? '').concat(` {{${variable}}}`), index);
  };
  return (
    <Fragment>
      <EuiFormRow
        id="webhookBody"
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.bodyFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
        isInvalid={errors.body.length > 0 && body !== undefined}
        fullWidth
        error={errors.body}
        labelAppend={
          <AddMessageVariables
            messageVariables={messageVariables}
            onSelectEventHandler={(variable: string) => onSelectMessageVariable('body', variable)}
            paramsProperty="body"
          />
        }
      >
        <EuiCodeEditor
          mode="json"
          width="100%"
          height="200px"
          theme="github"
          data-test-subj="webhookBodyEditor"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.bodyCodeEditorAriaLabel',
            {
              defaultMessage: 'Code editor',
            }
          )}
          value={body || ''}
          onChange={(json: string) => {
            editAction('body', json, index);
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookParamsFields as default };
