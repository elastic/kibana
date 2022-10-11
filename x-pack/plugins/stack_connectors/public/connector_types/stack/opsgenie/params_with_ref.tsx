/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, EuiSelect, RecursivePartial } from '@elastic/eui';
import { cloneDeep, isEqual, set } from 'lodash';
import { OpsgenieSubActions } from '../../../../common';
import type {
  OpsgenieActionParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieCreateAlertParams,
  OpsgenieCreateAlertSubActionParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';

type SubActionProps<SubActionParams> = Omit<
  ActionParamsProps<OpsgenieActionParams>,
  'actionParams' | 'editAction'
> & {
  actionParams: Partial<SubActionParams>;
  editSubAction: ActionParamsProps<OpsgenieActionParams>['editAction'];
};

const CreateAlertComponent: React.FC<SubActionProps<OpsgenieCreateAlertSubActionParams>> = ({
  actionParams,
  editSubAction,
  errors,
  index,
  messageVariables,
}) => {
  return (
    <>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editSubAction}
        messageVariables={messageVariables}
        paramsProperty={'message'}
        inputTargetValue={actionParams.subActionParams?.message}
        errors={errors['subActionParams.message'] as string[]}
        label={i18n.MESSAGE_FIELD_LABEL}
      />
      <EuiFormRow data-test-subj="opsgenie-alias-row" fullWidth label={i18n.ALIAS_FIELD_LABEL}>
        <TextFieldWithMessageVariables
          index={index}
          editAction={editSubAction}
          messageVariables={messageVariables}
          paramsProperty={'alias'}
          inputTargetValue={actionParams.subActionParams?.alias}
        />
      </EuiFormRow>
    </>
  );
};

CreateAlertComponent.displayName = 'CreateAlertComponent';

const CloseAlertComponent: React.FC<SubActionProps<OpsgenieCloseAlertSubActionParams>> = ({
  actionParams,
  editSubAction,
  errors,
  index,
  messageVariables,
}) => {
  const isAliasInvalid =
    errors['subActionParams.alias'] !== undefined &&
    errors['subActionParams.alias'].length > 0 &&
    actionParams.subActionParams?.alias !== undefined;

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
          inputTargetValue={actionParams.subActionParams?.alias}
          errors={errors['subActionParams.alias'] as string[]}
        />
      </EuiFormRow>
    </>
  );
};

CloseAlertComponent.displayName = 'CloseAlertComponent';

interface SubActionState {
  [OpsgenieSubActions.CreateAlert]: RecursivePartial<OpsgenieCreateAlertParams> | undefined;
  [OpsgenieSubActions.CloseAlert]: RecursivePartial<OpsgenieCreateAlertParams> | undefined;
}

const OpsgenieParamFields: React.FC<ActionParamsProps<OpsgenieActionParams>> = ({
  actionParams,
  editAction,
  errors,
  index,
  messageVariables,
}) => {
  const { subAction, subActionParams } = actionParams;

  const currentSubAction = useRef<string>(subAction ?? OpsgenieSubActions.CreateAlert);
  // const defaultedSubAction: OpsgenieSubActions = useMemo(
  //   () => subAction ?? OpsgenieSubActions.CreateAlert,
  //   [subAction]
  // );

  // useState<boolean>(true);
  // const [subActionParamsState, setSubActionParamsState] = useState<SubActionState>({
  //   createAlert: {},
  //   closeAlert: {},
  // });

  const form = useForm({defaultVAlues: })
  const {subAction, message, alias} = useFormData(form, {watch: ['message', 'alias']})

  useEffect(() => {
    editAction('subAction', subAction)
  }, [subAction])

  useEffect(() => {
    editAction('subActionParams', {message, alias})
  }, [message, alias])

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

    if (!subActionParams) {
      editAction('subActionParams', {}, index);
    }
    // TODO: should this depend on editAction?
  }, [editAction, index, subAction, subActionParams]);

  useEffect(() => {
    console.log('subAction', subAction);
    console.log('ref', currentSubAction.current);
    if (subAction != null && currentSubAction.current !== subAction) {
      console.log('got in here');
      currentSubAction.current = subAction;
      editAction('subActionParams', { alias: '4567' }, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subAction, currentSubAction]);

  return (
    <Form form={form}>
      <UseField config/>
      <EuiFormRow fullWidth label={i18n.ACTION_LABEL}>
        <EuiSelect
          fullWidth
          data-test-subj="opsgenie-eventActionSelect"
          options={actionOptions}
          hasNoInitialSelection={subAction == null}
          value={subAction}
          onChange={onActionChange}
        />
      </EuiFormRow>
      </UseField>

      {isCreateAlertAction(actionParams) ? (
        <CreateAlertComponent
          actionParams={actionParams}
          editSubAction={editSubAction}
          errors={errors}
          index={index}
          messageVariables={messageVariables}
        />
      ) : (
        <CloseAlertComponent
          actionParams={actionParams}
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

const isCreateAlertAction = (
  params: Partial<OpsgenieActionParams>
): params is Partial<OpsgenieCreateAlertSubActionParams> =>
  params.subAction === OpsgenieSubActions.CreateAlert;
