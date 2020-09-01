/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHorizontalRule,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { findIndex } from 'lodash/fp';
import React, { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';

import { ActionVariable } from '../../../../../../triggers_actions_ui/public';
import {
  RuleStep,
  RuleStepProps,
  ActionsStepRule,
} from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { Form, UseField, useForm } from '../../../../shared_imports';
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
import { APP_ID } from '../../../../../common/constants';

interface StepRuleActionsProps extends RuleStepProps {
  defaultValues?: ActionsStepRule | null;
  actionMessageParams: ActionVariable[];
}

const stepActionsDefaultValue: ActionsStepRule = {
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
  const {
    services: {
      application,
      triggers_actions_ui: { actionTypeRegistry },
    },
  } = useKibana();
  const kibanaAbsoluteUrl = useMemo(
    () =>
      application.getUrlForApp(`${APP_ID}`, {
        absolute: true,
      }),
    [application]
  );
  const initialState = {
    ...(defaultValues ?? stepActionsDefaultValue),
    kibanaSiemAppUrl: kibanaAbsoluteUrl,
  };
  const [throttle, setThrottle] = useState<ActionsStepRule['throttle']>(initialState.throttle);
  const schema = useMemo(() => getSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  const { form } = useForm<ActionsStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { getFields, submit } = form;

  const handleSubmit = useCallback(
    (enabled: boolean) => {
      getFields().enabled.setValue(enabled);
      if (onSubmit) {
        onSubmit();
      }
    },
    [getFields, onSubmit]
  );

  useEffect(() => {
    if (setForm) {
      setForm(RuleStep.ruleActions, submit);
    }
  }, [setForm, submit]);

  const throttleOptions = useMemo(() => {
    return getThrottleOptions(throttle);
  }, [throttle]);

  const throttleFieldComponentProps = useMemo(
    () => ({
      idAria: 'detectionEngineStepRuleActionsThrottle',
      isDisabled: isLoading,
      dataTestSubj: 'detectionEngineStepRuleActionsThrottle',
      hasNoInitialSelection: false,
      handleChange: setThrottle,
      euiFieldProps: {
        options: throttleOptions,
      },
    }),
    [isLoading, throttleOptions]
  );

  return isReadOnlyView ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription schema={schema} data={initialState} columns="single" />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepRuleActions">
          <EuiForm>
            <UseField
              path="throttle"
              component={ThrottleSelectField}
              componentProps={throttleFieldComponentProps}
            />
            {throttle !== stepActionsDefaultValue.throttle ? (
              <>
                <EuiSpacer />
                <UseField
                  path="actions"
                  component={RuleActionsField}
                  componentProps={{
                    messageVariables: actionMessageParams,
                  }}
                />
              </>
            ) : (
              <UseField path="actions" component={GhostFormField} />
            )}
            <UseField path="kibanaSiemAppUrl" component={GhostFormField} />
            <UseField path="enabled" component={GhostFormField} />
          </EuiForm>
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
                {I18n.COMPLETE_WITHOUT_ACTIVATING}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={() => handleSubmit(true)}
                data-test-subj="create-activate"
              >
                {I18n.COMPLETE_WITH_ACTIVATING}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

export const StepRuleActions = memo(StepRuleActionsComponent);
