/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo, useCallback, useEffect, useState } from 'react';

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

const stepScheduleDefaultValue = {
  interval: '5m',
  isNew: true,
  from: '1m',
};

const StepScheduleRuleComponent: FC<StepScheduleRuleProps> = ({
  addPadding = false,
  defaultValues,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  setStepData,
  setForm,
}) => {
  const initialState = defaultValues ?? stepScheduleDefaultValue;
  const [myStepData, setMyStepData] = useState<ScheduleStepRule>(initialState);

  const { form } = useForm({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { submit } = form;

  const onSubmit = useCallback(async () => {
    if (setStepData) {
      setStepData(RuleStep.scheduleRule, null, false);
      const { isValid: newIsValid, data } = await submit();
      if (newIsValid) {
        setStepData(RuleStep.scheduleRule, { ...data }, newIsValid);
        setMyStepData({ ...data, isNew: false } as ScheduleStepRule);
      }
    }
  }, [setStepData, submit]);

  useEffect(() => {
    if (setForm) {
      setForm(RuleStep.scheduleRule, form);
    }
  }, [form, setForm]);

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={schema} data={myStepData} />
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
        <NextStep dataTestSubj="schedule-continue" onClick={onSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepScheduleRule = memo(StepScheduleRuleComponent);
