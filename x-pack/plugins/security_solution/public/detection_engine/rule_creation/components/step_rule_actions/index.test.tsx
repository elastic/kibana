/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, type ComponentType as EnzymeComponentType } from 'enzyme';
import { render } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock';

import { StepRuleActions, stepActionsDefaultValue } from '.';
import {
  defaultSchedule,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../../../../detections/pages/detection_engine/rules/utils';
import { useRuleForms } from '../../../rule_creation_ui/pages/form';
import type { FormHook } from '../../../../shared_imports';
import type { ActionsStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { FrequencyDescription } from './notification_action';

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
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });

    expect(wrapper.find('Form[data-test-subj="stepRuleActions"]')).toHaveLength(1);
  });
});

describe('getFrequencyDescription', () => {
  it('should return empty string if frequency is not specified', () => {
    const { container } = render(<FrequencyDescription />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should correctly handle "For each alert. Per rule run."', async () => {
    const frequency = { notifyWhen: 'onActiveAlert', summary: false, throttle: null } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('For each alert. Per rule run.')).toBeInTheDocument();
  });

  it('should correctly handle "Summary of alerts. Per rule run."', async () => {
    const frequency = { notifyWhen: 'onActiveAlert', summary: true, throttle: null } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Summary of alerts. Per rule run.')).toBeInTheDocument();
  });

  it('should return empty string if type is "onThrottleInterval" but throttle is not specified', () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: null } as const;

    const { container } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it('should correctly handle "Once a second"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1s' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once a second')).toBeInTheDocument();
  });

  it('should correctly handle "Once in every # seconds"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '2s' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once in every 2 seconds')).toBeInTheDocument();
  });

  it('should correctly handle "Once a minute"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1m' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once a minute')).toBeInTheDocument();
  });

  it('should correctly handle "Once in every # minutes"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '2m' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once in every 2 minutes')).toBeInTheDocument();
  });

  it('should correctly handle "Once an hour"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1h' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once an hour')).toBeInTheDocument();
  });

  it('should correctly handle "Once in every # hours"', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '2h' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Once in every 2 hours')).toBeInTheDocument();
  });

  it('should correctly handle unknown time units', async () => {
    const frequency = { notifyWhen: 'onThrottleInterval', summary: true, throttle: '1z' } as const;

    const { findByText } = render(<FrequencyDescription frequency={frequency} />, {
      wrapper: TestProviders,
    });

    expect(await findByText('Periodically')).toBeInTheDocument();
  });
});
