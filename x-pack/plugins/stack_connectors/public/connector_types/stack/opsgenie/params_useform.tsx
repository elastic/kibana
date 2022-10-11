/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import {
  ActionParamsProps,
  TextAreaWithMessageVariables,
  TextFieldWithMessageVariables,
} from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFormRow, RecursivePartial } from '@elastic/eui';
import {
  Form,
  UseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  SelectField,
  TextAreaField,
  TextField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import { OpsgenieSubActions } from '../../../../common';
import type {
  OpsgenieActionParams,
  OpsgenieCloseAlertSubActionParams,
  OpsgenieCreateAlertParams,
  OpsgenieCreateAlertSubActionParams,
} from '../../../../server/connector_types/stack';
import * as i18n from './translations';

const { emptyField } = fieldValidators;

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
  const { subAction: subActionFromProps } = actionParams;

  // const currentSubAction = useRef<string>(subAction ?? OpsgenieSubActions.CreateAlert);
  // const defaultedSubAction: OpsgenieSubActions = useMemo(
  //   () => subAction ?? OpsgenieSubActions.CreateAlert,
  //   [subAction]
  // );

  // useState<boolean>(true);
  // const [subActionParamsState, setSubActionParamsState] = useState<SubActionState>({
  //   createAlert: {},
  //   closeAlert: {},
  // });

  const currentSubAction = useRef<OpsgenieSubActions>(
    actionParams.subAction ?? OpsgenieSubActions.CreateAlert
  );
  const { form } = useForm();
  const [{ subAction, message, alias }] = useFormData({
    form,
    watch: ['subAction', 'message', 'alias'],
  });

  useEffect(() => {
    console.log('sub action from params', subActionFromProps);
    console.log('currentSubAction', currentSubAction.current);
    if (subActionFromProps != null && currentSubAction.current !== subActionFromProps) {
      currentSubAction.current = subActionFromProps;
      console.log('updating sub action from current');
      editAction('subAction', subActionFromProps, index);
    }
  }, [index, subActionFromProps]);

  useEffect(() => {
    console.log('sub action', subAction);
    currentSubAction.current = subAction;
    editAction('subAction', subAction, index);
  }, [subAction, index]);

  useEffect(() => {
    // editAction('subActionParams', { message, alias }, index);
  }, [message, alias]);

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

  return (
    <Form form={form}>
      <UseField
        config={{
          label: i18n.ACTION_LABEL,
          defaultValue: actionParams.subAction ?? OpsgenieSubActions.CreateAlert,
        }}
        path={'subAction'}
        component={SelectField}
        componentProps={{
          euiFieldProps: {
            options: actionOptions,
            'data-test-subj': 'opsgenie-subAction',
          },
        }}
      />

      {subAction === OpsgenieSubActions.CreateAlert ? (
        <>
          <UseField
            config={{
              label: i18n.MESSAGE_FIELD_LABEL,
              validations: [{ validator: emptyField(i18n.MESSAGE_IS_REQUIRED) }],
            }}
            path={'message'}
            component={TextAreaField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'opsgenie-message',
              },
            }}
          />

          <UseField
            config={{
              label: i18n.ALIAS_FIELD_LABEL,
              defaultValue: actionParams.subActionParams?.alias,
            }}
            path={'alias'}
            component={TextField}
            componentProps={{ euiFieldProps: { 'data-test-subj': 'opsgenie-alias' } }}
          />
        </>
      ) : (
        <UseField
          config={{
            label: i18n.ALIAS_FIELD_LABEL,
            validations: [{ validator: emptyField(i18n.ALIAS_IS_REQUIRED) }],
            defaultValue: actionParams.subActionParams?.alias,
          }}
          path={'alias'}
          component={TextField}
          componentProps={{ euiFieldProps: { 'data-test-subj': 'opsgenie-alias' } }}
        />
      )}
    </Form>
  );
};

OpsgenieParamFields.displayName = 'OpsgenieParamFields';

// eslint-disable-next-line import/no-default-export
export { OpsgenieParamFields as default };

const isCreateAlertAction = (
  params: Partial<OpsgenieActionParams>
): params is Partial<OpsgenieCreateAlertSubActionParams> =>
  params.subAction === OpsgenieSubActions.CreateAlert;
