/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import styled from 'styled-components';
import React, { memo, useCallback, useEffect } from 'react';
import type { RuleStepProps, ScheduleStepRule } from '../../../pages/detection_engine/rules/types';
import { RuleStep } from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../schedule_item_form';
import { Form, UseField, useForm, useFormData } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { NextStep } from '../next_step';
import { schema } from './schema';

const StyledForm = styled(Form)`
  max-width: 235px !important;
`;
interface StepScheduleRuleProps extends RuleStepProps {
  defaultValues: ScheduleStepRule;
  onRuleDataChange?: (data: ScheduleStepRule) => void;
}

const StepScheduleRuleComponent: FC<StepScheduleRuleProps> = ({
  addPadding = false,
  defaultValues: initialState,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  onSubmit,
  setForm,
  onRuleDataChange,
}) => {
  const { form } = useForm<ScheduleStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const { getFormData, submit } = form;

  useFormData<ScheduleStepRule>({
    form,
    watch: ['from', 'interval'],
    onChange: (data: ScheduleStepRule) => {
      if (onRuleDataChange) {
        onRuleDataChange(data);
      }
    },
  });

  const handleSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit();
    }
  }, [onSubmit]);

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
        <StyledForm form={form} data-test-subj="stepScheduleRule">
          <UseField
            path="interval"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleInterval',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
              minimumValue: 1,
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
        </StyledForm>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="schedule-continue" onClick={handleSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepScheduleRule = memo(StepScheduleRuleComponent);
