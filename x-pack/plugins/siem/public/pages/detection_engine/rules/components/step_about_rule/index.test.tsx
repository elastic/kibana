/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, shallow } from 'enzyme';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_light.json';

import { StepAboutRule } from './';
import { mockAboutStepRule } from '../../all/__mocks__/mock';
import { StepRuleDescription } from '../description_step';
import { stepAboutDefaultValue } from './default_value';

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

    const nameInput = wrapper
      .find('input[aria-describedby="detectionEngineStepAboutRuleName"]')
      .at(0);
    nameInput.simulate('change', { target: { value: 'Test name text' } });

    const descriptionInput = wrapper
      .find('textarea[aria-describedby="detectionEngineStepAboutRuleDescription"]')
      .at(0);
    const nextButton = wrapper.find('button[data-test-subj="about-continue"]').at(0);
    nextButton.simulate('click');

    expect(
      wrapper
        .find('input[aria-describedby="detectionEngineStepAboutRuleName"]')
        .at(0)
        .props().value
    ).toEqual('Test name text');
    expect(descriptionInput.props().value).toEqual('');
    expect(
      wrapper
        .find('EuiFormRow[data-test-subj="detectionEngineStepAboutRuleDescription"] label')
        .at(0)
        .hasClass('euiFormLabel-isInvalid')
    ).toBeTruthy();
    expect(
      wrapper
        .find('EuiFormRow[data-test-subj="detectionEngineStepAboutRuleDescription"] EuiTextArea')
        .at(0)
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

    const descriptionInput = wrapper
      .find('textarea[aria-describedby="detectionEngineStepAboutRuleDescription"]')
      .at(0);
    descriptionInput.simulate('change', { target: { value: 'Test description text' } });

    const nameInput = wrapper
      .find('input[aria-describedby="detectionEngineStepAboutRuleName"]')
      .at(0);
    const nextButton = wrapper.find('button[data-test-subj="about-continue"]').at(0);
    nextButton.simulate('click');

    expect(
      wrapper
        .find('textarea[aria-describedby="detectionEngineStepAboutRuleDescription"]')
        .at(0)
        .props().value
    ).toEqual('Test description text');
    expect(nameInput.props().value).toEqual('');
    expect(
      wrapper
        .find('EuiFormRow[data-test-subj="detectionEngineStepAboutRuleName"] label')
        .at(0)
        .hasClass('euiFormLabel-isInvalid')
    ).toBeTruthy();
    expect(
      wrapper
        .find('EuiFormRow[data-test-subj="detectionEngineStepAboutRuleName"] EuiFieldText')
        .at(0)
        .prop('isInvalid')
    ).toBeTruthy();
  });

  test('it allows user to click continue if "name" and "description" are defined', () => {
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

    const descriptionInput = wrapper
      .find('textarea[aria-describedby="detectionEngineStepAboutRuleDescription"]')
      .at(0);
    descriptionInput.simulate('change', { target: { value: 'Test description text' } });

    const nameInput = wrapper
      .find('input[aria-describedby="detectionEngineStepAboutRuleName"]')
      .at(0);
    nameInput.simulate('change', { target: { value: 'Test name text' } });

    const nextButton = wrapper.find('button[data-test-subj="about-continue"]').at(0);
    nextButton.simulate('click');
  });
});
