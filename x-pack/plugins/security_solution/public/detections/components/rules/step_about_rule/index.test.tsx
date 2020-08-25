/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, shallow } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_light.json';

import { StepAboutRule } from '.';

import { mockAboutStepRule } from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { StepRuleDescription } from '../description_step';
import { stepAboutDefaultValue } from './default_value';
// we don't have the types for waitFor just yet, so using "as waitFor" until when we do
import { wait as waitFor } from '@testing-library/react';
import { AboutStepRule } from '../../../pages/detection_engine/rules/types';
import { fillEmptySeverityMappings } from '../../../pages/detection_engine/rules/helpers';

const theme = () => ({ eui: euiDarkVars, darkMode: true });

/* eslint-disable no-console */
// Silence until enzyme fixed to use ReactTestUtils.act()
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});
/* eslint-enable no-console */

describe('StepAboutRuleComponent', () => {
  test('it renders StepRuleDescription if isReadOnlyView is true and "name" property exists', () => {
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

  test('it prevents user from clicking continue if no "description" defined', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          isLoading={false}
          setForm={jest.fn()}
          setStepData={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first()
      .simulate('change', { target: { value: 'Test name text' } });

    const descriptionInput = wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first();
    wrapper.find('button[data-test-subj="about-continue"]').first().simulate('click');

    expect(
      wrapper.find('[data-test-subj="detectionEngineStepAboutRuleName"] input').first().props()
        .value
    ).toEqual('Test name text');
    expect(descriptionInput.props().value).toEqual('');
    expect(
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] label')
        .first()
        .hasClass('euiFormLabel-isInvalid')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] EuiTextArea')
        .first()
        .prop('isInvalid')
    ).toBeTruthy();
  });

  test('it prevents user from clicking continue if no "name" defined', () => {
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          isLoading={false}
          setForm={jest.fn()}
          setStepData={jest.fn()}
        />
      </ThemeProvider>
    );

    wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
      .first()
      .simulate('change', { target: { value: 'Test description text' } });

    const nameInput = wrapper
      .find('[data-test-subj="detectionEngineStepAboutRuleName"] input')
      .first();

    wrapper.find('button[data-test-subj="about-continue"]').first().simulate('click');

    expect(
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleDescription"] textarea')
        .first()
        .props().value
    ).toEqual('Test description text');
    expect(nameInput.props().value).toEqual('');
    expect(
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleName"] label')
        .first()
        .hasClass('euiFormLabel-isInvalid')
    ).toBeTruthy();
    expect(
      wrapper
        .find('[data-test-subj="detectionEngineStepAboutRuleName"] EuiFieldText')
        .first()
        .prop('isInvalid')
    ).toBeTruthy();
  });

  test('it allows user to click continue if "name" and "description" are defined', async () => {
    const stepDataMock = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          isLoading={false}
          setForm={jest.fn()}
          setStepData={stepDataMock}
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

    wrapper.find('button[data-test-subj="about-continue"]').first().simulate('click').update();
    await waitFor(() => {
      const expected: Omit<AboutStepRule, 'isNew'> = {
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
        riskScore: { value: 50, mapping: [], isMappingChecked: false },
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
      expect(stepDataMock.mock.calls[1][1]).toEqual(expected);
    });
  });

  test('it allows user to set the risk score as a number (and not a string)', async () => {
    const stepDataMock = jest.fn();
    const wrapper = mount(
      <ThemeProvider theme={theme}>
        <StepAboutRule
          addPadding={true}
          defaultValues={stepAboutDefaultValue}
          descriptionColumns="multi"
          isReadOnlyView={false}
          isLoading={false}
          setForm={jest.fn()}
          setStepData={stepDataMock}
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

    await act(async () => {
      wrapper.find('[data-test-subj="about-continue"]').first().simulate('click').update();
    });

    const expected: Omit<AboutStepRule, 'isNew'> = {
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
    expect(stepDataMock.mock.calls[1][1]).toEqual(expected);
  });
});
