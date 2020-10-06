/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, shallow } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_light.json';
import { act } from '@testing-library/react';

import { stubIndexPattern } from 'src/plugins/data/common/index_patterns/index_pattern.stub';
import { StepAboutRule } from '.';
import { useFetchIndex } from '../../../../common/containers/source';
import { mockAboutStepRule } from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { StepRuleDescription } from '../description_step';
import { stepAboutDefaultValue } from './default_value';
import {
  AboutStepRule,
  RuleStepsFormHooks,
  RuleStep,
} from '../../../pages/detection_engine/rules/types';
import { fillEmptySeverityMappings } from '../../../pages/detection_engine/rules/helpers';

jest.mock('../../../../common/containers/source');
const theme = () => ({ eui: euiDarkVars, darkMode: true });
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line react/display-name, @typescript-eslint/no-explicit-any
    EuiFieldText: (props: any) => {
      const { isInvalid, isLoading, fullWidth, inputRef, isDisabled, ...validInputProps } = props;
      return <input {...validInputProps} />;
    },
  };
});
describe('StepAboutRuleComponent', () => {
  let formHook: RuleStepsFormHooks[RuleStep.aboutRule] | null = null;
  const setFormHook = <K extends keyof RuleStepsFormHooks>(
    step: K,
    hook: RuleStepsFormHooks[K]
  ) => {
    formHook = hook as typeof formHook;
  };

  beforeEach(() => {
    formHook = null;
    (useFetchIndex as jest.Mock).mockImplementation(() => [
      false,
      {
        indexPatterns: stubIndexPattern,
      },
    ]);
  });

  it('it renders StepRuleDescription if isReadOnlyView is true and "name" property exists', () => {
    const wrapper = shallow(
      <StepAboutRule
        addPadding={false}
        defaultValues={mockAboutStepRule()}
        descriptionColumns="multi"
        isReadOnlyView={true}
        isLoading={false}
      />
    );

    expect(wrapper.find(StepRuleDescription).exists()).toBeTruthy();
  });

  it('is invalid if description is not present', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          setForm={setFormHook}
          isLoading={false}
        />
      </ThemeProvider>
    );

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
        .first()
        .simulate('change', { target: { value: 'Test name text' } });

      const result = await formHook();
      expect(result?.isValid).toEqual(false);
    });
  });

  it('is invalid if no "name" is present', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          setForm={setFormHook}
          isLoading={false}
        />
      </ThemeProvider>
    );

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }

      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
        .first()
        .simulate('change', { target: { value: 'Test description text' } });
      const result = await formHook();
      expect(result?.isValid).toEqual(false);
    });
  });

  it('is valid if both "name" and "description" are present', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          setForm={setFormHook}
          isLoading={false}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });
    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    const expected: AboutStepRule = {
      author: [],
      isAssociatedToEndpointList: false,
      isBuildingBlock: false,
      license: '',
      ruleNameOverride: '',
      timestampOverride: '',
      description: 'Test description text',
      falsePositives: [''],
      name: 'Test name text',
      note: '',
      references: [''],
      riskScore: { value: 21, mapping: [], isMappingChecked: false },
      severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
      tags: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ],
    };

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      const result = await formHook();
      expect(result?.isValid).toEqual(true);
      expect(result?.data).toEqual(expected);
    });
  });

  it('it allows user to set the risk score as a number (and not a string)', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          setForm={setFormHook}
          isLoading={false}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleRiskScore"] input')
      .first()
      .simulate('change', { target: { value: '80' } });

    const expected: AboutStepRule = {
      author: [],
      isAssociatedToEndpointList: false,
      isBuildingBlock: false,
      license: '',
      ruleNameOverride: '',
      timestampOverride: '',
      description: 'Test description text',
      falsePositives: [''],
      name: 'Test name text',
      note: '',
      references: [''],
      riskScore: { value: 80, mapping: [], isMappingChecked: false },
      severity: { value: 'low', mapping: fillEmptySeverityMappings([]), isMappingChecked: false },
      tags: [],
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'none', name: 'none', reference: 'none' },
          technique: [],
        },
      ],
    };

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      const result = await formHook();
      expect(result?.isValid).toEqual(true);
      expect(result?.data).toEqual(expected);
    });
  });

  it('does not modify the provided risk score until the user changes the severity', async () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          setForm={setFormHook}
          isLoading={false}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    await act(async () => {
      if (!formHook) {
        throw new Error('Form hook not set, but tests depend on it');
      }
      const result = await formHook();
      expect(result?.isValid).toEqual(true);
      expect(result?.data?.riskScore.value).toEqual(21);

      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleSeverity"] [data-test-subj="select"]')
        .last()
        .simulate('click');
      wrapper.find('button#medium').simulate('click');

      const result2 = await formHook();
      expect(result2?.isValid).toEqual(true);
      expect(result2?.data?.riskScore.value).toEqual(47);
    });
  });
});
