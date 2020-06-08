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
import deepEqual from 'fast-deep-equal';

import { setFieldValue } from '../../../pages/detection_engine/rules/helpers';
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

interface StepRuleActionsProps extends RuleStepProps {
  defaultValues?: ActionsStepRule | null;
  actionMessageParams: string[];
}

const stepActionsDefaultValue = {
  enabled: true,
  isNew: true,
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
  setStepData,
  setForm,
  actionMessageParams,
}) => {
  const [myStepData, setMyStepData] = useState<ActionsStepRule>(stepActionsDefaultValue);
  const {
    services: {
      application,
      triggers_actions_ui: { actionTypeRegistry },
    },
  } = useKibana();
  const schema = useMemo(() => getSchema({ actionTypeRegistry }), [actionTypeRegistry]);

  const { form } = useForm({
    defaultValue: myStepData,
    options: { stripEmptyFields: false },
    schema,
  });

  const kibanaAbsoluteUrl = useMemo(() => application.getUrlForApp('siem', { absolute: true }), [
    application,
  ]);

  const onSubmit = useCallback(
    async (enabled: boolean) => {
      if (setStepData) {
        setStepData(RuleStep.ruleActions, null, false);
        const { isValid: newIsValid, data } = await form.submit();
        if (newIsValid) {
          setStepData(RuleStep.ruleActions, { ...data, enabled }, newIsValid);
          setMyStepData({ ...data, isNew: false } as ActionsStepRule);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form]
  );

  useEffect(() => {
    const { isNew, ...initDefaultValue } = myStepData;
    if (defaultValues != null && !deepEqual(initDefaultValue, defaultValues)) {
      const myDefaultValues = {
        ...defaultValues,
        isNew: false,
      };
      setMyStepData(myDefaultValues);
      setFieldValue(form, schema, myDefaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]);

  useEffect(() => {
    if (setForm != null) {
      setForm(RuleStep.ruleActions, form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const updateThrottle = useCallback((throttle) => setMyStepData({ ...myStepData, throttle }), [
    myStepData,
    setMyStepData,
  ]);

  const throttleOptions = useMemo(() => {
    const throttle = myStepData.throttle;

    return getThrottleOptions(throttle);
  }, [myStepData]);

  const throttleFieldComponentProps = useMemo(
    () => ({
      idAria: 'detectionEngineStepRuleActionsThrottle',
      isDisabled: isLoading,
      dataTestSubj: 'detectionEngineStepRuleActionsThrottle',
      hasNoInitialSelection: false,
      handleChange: updateThrottle,
      euiFieldProps: {
        options: throttleOptions,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, updateThrottle]
  );

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription schema={schema} data={myStepData} columns="single" />
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
            {myStepData.throttle !== stepActionsDefaultValue.throttle ? (
              <>
                <EuiSpacer />
                <UseField
                  path="actions"
                  defaultValue={myStepData.actions}
                  component={RuleActionsField}
                  componentProps={{
                    messageVariables: actionMessageParams,
                  }}
                />
              </>
            ) : (
              <UseField
                path="actions"
                defaultValue={myStepData.actions}
                component={GhostFormField}
              />
            )}
            <UseField
              path="kibanaSiemAppUrl"
              defaultValue={kibanaAbsoluteUrl}
              component={GhostFormField}
            />
            <UseField path="enabled" defaultValue={myStepData.enabled} component={GhostFormField} />
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
                onClick={onSubmit.bind(null, false)}
              >
                {I18n.COMPLETE_WITHOUT_ACTIVATING}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={onSubmit.bind(null, true)}
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
