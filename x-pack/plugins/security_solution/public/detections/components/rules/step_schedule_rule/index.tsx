/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, memo, useCallback, useEffect } from 'react';
import { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import {
  RuleStep,
  RuleStepProps,
  ScheduleStepRule,
} from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../schedule_item_form';
import { Form, UseField, useForm } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { NextStep } from '../next_step';
import { schema } from './schema';

interface StepScheduleRuleProps extends RuleStepProps {
  defaultValues?: ScheduleStepRule | null;
  ruleType?: Type;
}

const DEFAULT_INTERVAL = '5m';
const DEFAULT_FROM = '1m';
const THREAT_MATCH_INTERVAL = '1h';
const THREAT_MATCH_FROM = '5m';

const getStepScheduleDefaultValue = (ruleType: Type | undefined): ScheduleStepRule => {
  return {
    interval: isThreatMatchRule(ruleType) ? THREAT_MATCH_INTERVAL : DEFAULT_INTERVAL,
    from: isThreatMatchRule(ruleType) ? THREAT_MATCH_FROM : DEFAULT_FROM,
  };
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
  ruleType,
}) => {
  const initialState = defaultValues ?? getStepScheduleDefaultValue(ruleType);

  const { form } = useForm<ScheduleStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const { getFormData, submit } = form;

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
