/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiFormRow } from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { ServerLogActionParams } from '.././types';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';

export const ServerLogParamsFields: React.FunctionComponent<ActionParamsProps<
  ServerLogActionParams
>> = ({ actionParams, editAction, index, errors, messageVariables, defaultMessage }) => {
  const { message, level } = actionParams;
  const levelOptions = [
    { value: 'trace', text: 'Trace' },
    { value: 'debug', text: 'Debug' },
    { value: 'info', text: 'Info' },
    { value: 'warn', text: 'Warning' },
    { value: 'error', text: 'Error' },
    { value: 'fatal', text: 'Fatal' },
  ];

  useEffect(() => {
    editAction('level', 'info', index);
    if (!message && defaultMessage && defaultMessage.length > 0) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <EuiFormRow
        id="loggingLevel"
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.logLevelFieldLabel',
          {
            defaultMessage: 'Level',
          }
        )}
      >
        <EuiSelect
          fullWidth
          id="loggLevelSelect"
          data-test-subj="loggingLevelSelect"
          options={levelOptions}
          value={level}
          defaultValue={'info'}
          onChange={(e) => {
            editAction('level', e.target.value, index);
          }}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editAction}
        messageVariables={messageVariables}
        paramsProperty={'message'}
        inputTargetValue={message}
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.serverLogAction.logMessageFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
        errors={errors.message as string[]}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServerLogParamsFields as default };
