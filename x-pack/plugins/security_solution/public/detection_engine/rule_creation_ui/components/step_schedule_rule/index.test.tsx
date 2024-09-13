/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount, type ComponentType as EnzymeComponentType } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { StepScheduleRule, StepScheduleRuleReadOnly } from '.';
import {
  getStepScheduleDefaultValue,
  defaultSchedule,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../../../../detections/pages/detection_engine/rules/utils';
import { useRuleForms } from '../../pages/form';
import { stepActionsDefaultValue } from '../../../rule_creation/components/step_rule_actions';
import type { FormHook } from '../../../../shared_imports';
import type { ScheduleStepRule } from '../../../../detections/pages/detection_engine/rules/types';

describe('StepScheduleRule', () => {
  const TestComp = ({
    setFormRef,
  }: {
    setFormRef: (form: FormHook<ScheduleStepRule, ScheduleStepRule>) => void;
  }) => {
    const { scheduleStepForm } = useRuleForms({
      defineStepDefault: stepDefineDefaultValue,
      aboutStepDefault: stepAboutDefaultValue,
      scheduleStepDefault: defaultSchedule,
      actionsStepDefault: stepActionsDefaultValue,
    });

    setFormRef(scheduleStepForm);

    return <StepScheduleRule isLoading={false} form={scheduleStepForm} />;
  };
  it('renders correctly', () => {
    const wrapper = mount(<TestComp setFormRef={() => {}} />, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });

    expect(wrapper.find('Form[data-test-subj="stepScheduleRule"]')).toHaveLength(1);
  });

  it('renders correctly if isReadOnlyView', () => {
    const wrapper = shallow(
      <StepScheduleRuleReadOnly
        addPadding={false}
        defaultValues={getStepScheduleDefaultValue('query')}
        descriptionColumns="singleSplit"
      />
    );

    expect(wrapper.find('StepContentWrapper')).toHaveLength(1);
  });
});
