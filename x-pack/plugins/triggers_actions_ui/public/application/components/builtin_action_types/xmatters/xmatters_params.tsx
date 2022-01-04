/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow } from '@elastic/eui';
import { ActionParamsProps } from '../../../../types';
import { XmattersActionParams } from '../types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';

const XmattersParamsFields: React.FunctionComponent<ActionParamsProps<XmattersActionParams>> = ({
  actionParams,
  editAction,
  index,
  messageVariables,
  errors,
}) => {
  return (
    <EuiFormRow
      id="xmattersClass"
      fullWidth
      label={i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.classFieldLabel',
        {
          defaultMessage: 'Class (optional)',
        }
      )}
    >
      <TextFieldWithMessageVariables
        index={index}
        editAction={editAction}
        messageVariables={messageVariables}
        paramsProperty={'class'}
        inputTargetValue={actionParams.alertId}
      />
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { XmattersParamsFields as default };
