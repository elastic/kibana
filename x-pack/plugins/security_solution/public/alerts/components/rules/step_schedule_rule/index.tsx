/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, memo, useCallback, useEffect, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import styled from 'styled-components';

import { setFieldValue } from '../../../pages/detection_engine/rules/helpers';
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

const RestrictedWidthContainer = styled.div`
  max-width: 300px;
`;

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
  const [myStepData, setMyStepData] = useState<ScheduleStepRule>(stepScheduleDefaultValue);

  const { form } = useForm({
    defaultValue: myStepData,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    if (setStepData) {
      setStepData(RuleStep.scheduleRule, null, false);
      const { isValid: newIsValid, data } = await form.submit();
      if (newIsValid) {
        setStepData(RuleStep.scheduleRule, { ...data }, newIsValid);
        setMyStepData({ ...data, isNew: false } as ScheduleStepRule);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

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
      setForm(RuleStep.scheduleRule, form);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  return isReadOnlyView && myStepData != null ? (
    <StepContentWrapper addPadding={addPadding}>
      <StepRuleDescription columns={descriptionColumns} schema={schema} data={myStepData} />
    </StepContentWrapper>
  ) : (
    <>
      <StepContentWrapper addPadding={!isUpdateView}>
        <Form form={form} data-test-subj="stepScheduleRule">
          <RestrictedWidthContainer>
            <UseField
              path="interval"
              component={ScheduleItem}
              componentProps={{
                idAria: 'detectionEngineStepScheduleRuleInterval',
                isDisabled: isLoading,
                dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
              }}
            />
          </RestrictedWidthContainer>
          <RestrictedWidthContainer>
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
          </RestrictedWidthContainer>
        </Form>
      </StepContentWrapper>

      {!isUpdateView && (
        <NextStep dataTestSubj="schedule-continue" onClick={onSubmit} isDisabled={isLoading} />
      )}
    </>
  );
};

export const StepScheduleRule = memo(StepScheduleRuleComponent);
