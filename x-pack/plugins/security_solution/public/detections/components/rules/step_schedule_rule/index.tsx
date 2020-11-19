/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo, useCallback, useEffect } from 'react';

import {
  RuleStep,
  RuleStepProps,
  ScheduleStepRule,
} from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../schedule_item_form';
import { Form, UseField, useForm } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { schema } from './schema';

interface StepScheduleRuleProps extends RuleStepProps {
  defaultValues?: ScheduleStepRule | null;
}

const stepScheduleDefaultValue: ScheduleStepRule = {
  interval: '5m',
  from: '1m',
};

const StepScheduleRuleComponent: FC<StepScheduleRuleProps> = ({
  addPadding = false,
  defaultValues,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  onSubmit,
  setForm,
}) => {
  const initialState = defaultValues ?? stepScheduleDefaultValue;

  const { form } = useForm<ScheduleStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const { getFormData, getErrors, submit } = form;

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

  const getData = useCallback(async () => {
    const result = await submit();
    return result?.isValid
      ? { ...result, errors: [] }
      : {
          isValid: false,
          data: getFormData(),
          errors: getErrors(),
        };
  }, [getFormData, getErrors, submit]);

  useEffect(() => {
    let didCancel = false;
    if (setForm && !didCancel) {
      setForm(RuleStep.scheduleRule, getData);
    }
    return () => {
      didCancel = true;
    };
  }, [getData, setForm]);

  return isReadOnlyView ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={schema} data={initialState} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepScheduleRule">
          <UseField
            path="interval"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleInterval',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
            }}
          />
          <UseField
            path="from"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleFrom',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleFrom',
              minimumValue: 1,
            }}
          />
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="schedule-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepScheduleRule = memo(StepScheduleRuleComponent);
