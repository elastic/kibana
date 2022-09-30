/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  ActionParamsProps,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import { CreateAlertActionParams, OpsgenieActionParams } from './types';
import * as i18n from './translations';

const OpsgenieParamFields: React.FC<ActionParamsProps<OpsgenieActionParams>> = ({
  actionConnector,
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const { subAction, subActionParams } = actionParams;

  const actionOptions = [
    {
      value: 'createAlert',
      text: i18n.CREATE_ALERT_ACTION,
    },
    {
      value: 'closeAlert',
      text: i18n.CLOSE_ALERT_ACTION,
    },
  ];

  const onActionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      editAction('subAction', event.target.value, index);
    },
    // TODO: should this be depending on editaction? Seems like all the other connectors ignore it to avoid rerendering
    [editAction, index]
  );

  return (
    <>
      <EuiFormRow fullWidth label={i18n.ACTION_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="eventActionSelect"
          options={actionOptions}
          hasNoInitialSelection={subAction == null}
          value={subAction}
          onChange={onActionChange}
        />
      </EuiFormRow>

      {isCreateAlertAction(actionParams) ? (
        <EuiFormRow fullWidth label={i18n.MESSAGE_FIELD_LABEL}>
          <TextFieldWithMessageVariables
            index={index}
            editAction={editAction}
            messageVariables={messageVariables}
            paramsProperty={'message'}
            inputTargetValue={actionParams.subActionParams?.message}
            errors={errors['subActionParams.message'] as string[]}
          />
        </EuiFormRow>
      ) : null}
    </>
  );
};

const isCreateAlertAction = (
  params: Partial<OpsgenieActionParams>
): params is Partial<CreateAlertActionParams> => params.subAction === 'createAlert';
