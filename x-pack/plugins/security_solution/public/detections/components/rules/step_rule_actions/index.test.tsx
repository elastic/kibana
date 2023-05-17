/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';

import { StepRuleActions, stepActionsDefaultValue } from '.';
import {
  defaultSchedule,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../../../pages/detection_engine/rules/utils';
import { useRuleForms } from '../../../../detection_engine/rule_creation_ui/pages/form';
import type { FormHook } from '../../../../shared_imports';
import type { ActionsStepRule } from '../../../pages/detection_engine/rules/types';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        getUrlForApp: jest.fn(),
        capabilities: {
          siem: {
            crud: true,
          },
          actions: {
            read: true,
          },
        },
      },
      triggersActionsUi: {
        actionTypeRegistry: jest.fn(),
      },
    },
  }),
}));

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

const actionMessageParams = {
  context: [],
  state: [],
  params: [],
};

describe('StepRuleActions', () => {
  const TestComp = ({
    setFormRef,
  }: {
    setFormRef: (form: FormHook<ActionsStepRule, ActionsStepRule>) => void;
  }) => {
    const { actionsStepForm } = useRuleForms({
      defineStepDefault: stepDefineDefaultValue,
      aboutStepDefault: stepAboutDefaultValue,
      scheduleStepDefault: defaultSchedule,
      actionsStepDefault: stepActionsDefaultValue,
    });

    setFormRef(actionsStepForm);

    return (
      <StepRuleActions
        actionMessageParams={actionMessageParams}
        summaryActionMessageParams={actionMessageParams}
        isLoading={false}
        form={actionsStepForm}
      />
    );
  };
  it('renders correctly', () => {
    const wrapper = mount(<TestComp setFormRef={() => {}} />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('Form[data-test-subj="stepRuleActions"]')).toHaveLength(1);
  });
});
