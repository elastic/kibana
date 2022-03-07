/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { findIndex } from 'lodash/fp';
import React, { FC, memo, useCallback, useEffect, useMemo } from 'react';

import { ActionVariables } from '../../../../../../triggers_actions_ui/public';
import {
  RuleStep,
  RuleStepProps,
  ActionsStepRule,
} from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField, useForm, useFormData } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import {
  ThrottleSelectField,
  THROTTLE_OPTIONS,
  DEFAULT_THROTTLE_OPTION,
} from '../throttle_select_field';
import { RuleActionsField } from '../rule_actions_field';
import { useKibana } from '../../../../common/lib/kibana';
import { getSchema } from './schema';
import * as I18n from './translations';
import { APP_UI_ID } from '../../../../../common/constants';
import { useManageCaseAction } from './use_manage_case_action';

interface StepRuleActionsProps extends RuleStepProps {
  defaultValues?: ActionsStepRule | null;
  actionMessageParams: ActionVariables;
}

export const stepActionsDefaultValue: ActionsStepRule = {
  enabled: true,
  actions: [],
  kibanaSiemAppUrl: '',
  throttle: DEFAULT_THROTTLE_OPTION.value,
};

const GhostFormField = () => <></>;

const getThrottleOptions = (throttle?: string | null) => {
  // Add support for throttle options set by the API
  if (throttle && findIndex(['value', throttle], THROTTLE_OPTIONS) < 0) {
    return [...THROTTLE_OPTIONS, { value: throttle, text: throttle }];
  }

  return THROTTLE_OPTIONS;
};

const StepRuleActionsComponent: FC<StepRuleActionsProps> = ({
  addPadding = false,
  defaultValues,
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  onSubmit,
  setForm,
  actionMessageParams,
}) => {
  const [isLoadingCaseAction, hasErrorOnCreationCaseAction] = useManageCaseAction();
  const {
    services: {
      application,
      triggersActionsUi: { actionTypeRegistry },
    },
  } = useKibana();
  const kibanaAbsoluteUrl = useMemo(
    () =>
      application.getUrlForApp(`${APP_UI_ID}`, {
        absolute: true,
      }),
    [application]
  );
  const initialState = {
    ...(defaultValues ?? stepActionsDefaultValue),
    kibanaSiemAppUrl: kibanaAbsoluteUrl,
  };

  const schema = useMemo(() => getSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  const { form } = useForm<ActionsStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, getFormData, submit } = form;
  const [{ throttle: formThrottle }] = useFormData<ActionsStepRule>({
    form,
    watch: ['throttle'],
  });
  const throttle = formThrottle || initialState.throttle;

  const handleSubmit = useCallback(
    (enabled: boolean) => {
      getFields().enabled.setValue(enabled);
      if (onSubmit) {
        onSubmit();
      }
    },
    [getFields, onSubmit]
  );

  const getData = useCallback(async () => {
    const result = await submit();
    return result?.isValid
      ? result
      : {
          isValid: false,
          data: getFormData(),
        };
  }, [getFormData, submit]);

  useEffect(() => {
    let didCancel = false;
    if (setForm && !didCancel) {
      setForm(RuleStep.ruleActions, getData);
    }
    return () => {
      didCancel = true;
    };
  }, [getData, setForm]);

  const throttleOptions = useMemo(() => {
    return getThrottleOptions(throttle);
  }, [throttle]);

  const throttleFieldComponentProps = useMemo(
    () => ({
      idAria: 'detectionEngineStepRuleActionsThrottle',
      isDisabled: isLoading,
      isLoading: isLoadingCaseAction,
      dataTestSubj: 'detectionEngineStepRuleActionsThrottle',
      hasNoInitialSelection: false,
      euiFieldProps: {
        options: throttleOptions,
      },
    }),
    [isLoading, isLoadingCaseAction, throttleOptions]
  );

  const displayActionsOptions = useMemo(
    () =>
      throttle !== stepActionsDefaultValue.throttle ? (
        <>
          <EuiSpacer />
          <UseField
            path="actions"
            component={RuleActionsField}
            componentProps={{
              messageVariables: actionMessageParams,
              hasErrorOnCreationCaseAction,
            }}
          />
        </>
      ) : (
        <UseField path="actions" component={GhostFormField} />
      ),
    [throttle, actionMessageParams, hasErrorOnCreationCaseAction]
  );
  // only display the actions dropdown if the user has "read" privileges for actions
  const displayActionsDropDown = useMemo(() => {
    return application.capabilities.actions.show ? (
      <>
        <UseField
          path="throttle"
          component={ThrottleSelectField}
          componentProps={throttleFieldComponentProps}
        />
        {displayActionsOptions}
        <UseField path="kibanaSiemAppUrl" component={GhostFormField} />
        <UseField path="enabled" component={GhostFormField} />
      </>
    ) : (
      <>
        <EuiText>{I18n.NO_ACTIONS_READ_PERMISSIONS}</EuiText>
        <UseField
          path="throttle"
          componentProps={throttleFieldComponentProps}
          component={GhostFormField}
        />
        <UseField path="actions" component={GhostFormField} />
        <UseField path="kibanaSiemAppUrl" component={GhostFormField} />
        <UseField path="enabled" component={GhostFormField} />
      </>
    );
  }, [application.capabilities.actions.show, displayActionsOptions, throttleFieldComponentProps]);

  if (isReadOnlyView) {
    return (
      <StepContentWrapper addPadding={addPadding}>
        <StepRuleDescription schema={schema} data={initialState} columns="single" />
      </StepContentWrapper>
    );
  }

  return (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepRuleActions">
          <EuiForm>{displayActionsDropDown}</EuiForm>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={false}
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={() => handleSubmit(false)}
              >
                {I18n.COMPLETE_WITHOUT_ENABLING}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={() => handleSubmit(true)}
                data-test-subj="create-enable"
              >
                {I18n.COMPLETE_WITH_ENABLING}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const StepRuleActions = memo(StepRuleActionsComponent);
