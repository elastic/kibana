/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect, RecursivePartial } from '@elastic/eui';
import { OpsgenieSubActions } from '../../../../common';
import type {
  OpsgenieActionParams,
  OpsgenieCloseAlertParams,
  OpsgenieCreateAlertParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';

type SubActionProps<SubActionParams> = Omit<
  ActionParamsProps<OpsgenieActionParams>,
  'actionParams' | 'editAction'
> & {
  subActionParams?: RecursivePartial<SubActionParams>;
  editSubAction: ActionParamsProps<OpsgenieActionParams>['editAction'];
};

const CreateAlertComponent: React.FC<SubActionProps<OpsgenieCreateAlertParams>> = ({
  editSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
}) => {
  const isMessageInvalid =
    errors['subActionParams.message'] !== undefined &&
    errors['subActionParams.message'].length > 0 &&
    subActionParams?.message !== undefined;

  return (
    <>
      <EuiFormRow
        data-test-subj="opsgenie-message-row"
        fullWidth
        error={errors['subActionParams.message']}
        label={i18n.MESSAGE_FIELD_LABEL}
        isInvalid={isMessageInvalid}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'message'}
          inputTargetValue={subActionParams?.message}
          errors={errors['subActionParams.message'] as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubAction}
        messageVariables={messageVariables}
        paramsProperty={'description'}
        inputTargetValue={subActionParams?.description}
        label={i18n.DESCRIPTION_FIELD_LABEL}
      />
      <EuiFormRow data-test-subj="opsgenie-alias-row" fullWidth label={i18n.ALIAS_FIELD_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={subActionParams?.alias}
        />
      </EuiFormRow>
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlertComponent';

const CloseAlertComponent: React.FC<SubActionProps<OpsgenieCloseAlertParams>> = ({
  editSubAction,
  errors,
  index,
  messageVariables,
  subActionParams,
}) => {
  const isAliasInvalid =
    errors['subActionParams.alias'] !== undefined &&
    errors['subActionParams.alias'].length > 0 &&
    subActionParams?.alias !== undefined;

  return (
    <>
      <EuiFormRow
        data-test-subj="opsgenie-alias-row"
        fullWidth
        error={errors['subActionParams.alias']}
        isInvalid={isAliasInvalid}
        label={i18n.ALIAS_FIELD_LABEL}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={subActionParams?.alias}
          errors={errors['subActionParams.alias'] as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubAction}
        messageVariables={messageVariables}
        paramsProperty={'note'}
        inputTargetValue={subActionParams?.note}
        label={i18n.NOTE_FIELD_LABEL}
      />
    </>
  );
};

CloseAlertComponent.displayName = 'CloseAlertComponent';

const actionOptions = [
  {
    value: OpsgenieSubActions.CreateAlert,
    text: i18n.CREATE_ALERT_ACTION,
  },
  {
    value: OpsgenieSubActions.CloseAlert,
    text: i18n.CLOSE_ALERT_ACTION,
  },
];

const OpsgenieParamFields: React.FC<ActionParamsProps<OpsgenieActionParams>> = ({
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const { subAction, subActionParams } = actionParams;

  const currentSubAction = useRef<string>(subAction ?? OpsgenieSubActions.CreateAlert);

  const onActionChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      editAction('subAction', event.target.value, index);
    },
    [editAction, index]
  );

  const editSubAction = useCallback(
    (key, value) => {
      editAction('subActionParams', { ...subActionParams, [key]: value }, index);
    },
    [editAction, index, subActionParams]
  );

  useEffect(() => {
    if (!subAction) {
      editAction('subAction', OpsgenieSubActions.CreateAlert, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, subAction]);

  useEffect(() => {
    if (subAction != null && currentSubAction.current !== subAction) {
      currentSubAction.current = subAction;
      const params = subActionParams?.alias ? { alias: subActionParams.alias } : undefined;
      editAction('subActionParams', params, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAction, currentSubAction]);

  return (
    <>
      <EuiFormRow fullWidth label={i18n.ACTION_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="opsgenie-subActionSelect"
          options={actionOptions}
          hasNoInitialSelection={subAction == null}
          value={subAction}
          onChange={onActionChange}
        />
      </EuiFormRow>

      {subAction != null && subAction === OpsgenieSubActions.CreateAlert && (
        <CreateAlertComponent
          subActionParams={subActionParams}
          editSubAction={editSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}

      {subAction != null && subAction === OpsgenieSubActions.CloseAlert && (
        <CloseAlertComponent
          subActionParams={subActionParams}
          editSubAction={editSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      )}
    </>
  );
};

OpsgenieParamFields.displayName = 'OpsgenieParamFields';

// eslint-disable-next-line import/no-default-export
export { OpsgenieParamFields as default };
