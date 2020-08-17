/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, shallow } from 'enzyme';
import { EuiProgress, EuiButtonGroup } from '@elastic/eui';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_light.json';

import { StepAboutRuleToggleDetails } from '.';
import { mockAboutStepRule } from '../../../pages/detection_engine/rules/all/__mocks__/mock';
import { HeaderSection } from '../../../../common/components/header_section';
import { StepAboutRule } from '../step_about_rule';
import { AboutStepRule } from '../../../pages/detection_engine/rules/types';

jest.mock('../../../../common/lib/kibana');

const theme = () => ({ eui: euiDarkVars, darkMode: true });

describe('StepAboutRuleToggleDetails', () => {
  let mockRule: AboutStepRule;

  beforeEach(() => {
    mockRule = mockAboutStepRule();
  });

  test('it renders loading component when "loading" is true', () => {
    const wrapper = shallow(
      <StepAboutRuleToggleDetails
        loading={true}
        stepDataDetails={{
          note: mockRule.note,
          description: mockRule.description,
        }}
        stepData={mockRule}
      />
    );

    expect(wrapper.find(EuiProgress).exists()).toBeTruthy();
    expect(wrapper.find(HeaderSection).exists()).toBeTruthy();
  });

  test('it does not render details if stepDataDetails is null', () => {
    const wrapper = shallow(
      <StepAboutRuleToggleDetails loading={true} stepDataDetails={null} stepData={mockRule} />
    );

    expect(wrapper.find(StepAboutRule).exists()).toBeFalsy();
  });

  test('it does not render details if stepData is null', () => {
    const wrapper = shallow(
      <StepAboutRuleToggleDetails
        loading={true}
        stepDataDetails={{
          note: '',
          description: '',
        }}
        stepData={null}
      />
    );

    expect(wrapper.find(StepAboutRule).exists()).toBeFalsy();
  });

  describe('note value is empty string', () => {
    test('it does not render toggle buttons', () => {
      const mockAboutStepWithoutNote = {
        ...mockRule,
        note: '',
      };
      const wrapper = shallow(
        <StepAboutRuleToggleDetails
          loading={false}
          stepDataDetails={{
            note: '',
            description: mockRule.description,
          }}
          stepData={mockAboutStepWithoutNote}
        />
      );

      expect(wrapper.find('[data-test-subj="stepAboutDetailsToggle"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="stepAboutDetailsNoteContent"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="stepAboutDetailsContent"]').exists()).toBeTruthy();
    });
  });

  describe('note value does exist', () => {
    test('it renders toggle buttons, defaulted to "details"', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails
            loading={false}
            stepDataDetails={{
              note: mockRule.note,
              description: mockRule.description,
            }}
            stepData={mockRule}
          />
        </ThemeProvider>
      );

      expect(wrapper.find(EuiButtonGroup).exists()).toBeTruthy();
      expect(wrapper.find('EuiButtonToggle[id="details"]').at(0).prop('isSelected')).toBeTruthy();
      expect(wrapper.find('EuiButtonToggle[id="notes"]').at(0).prop('isSelected')).toBeFalsy();
    });

    test('it allows users to toggle between "details" and "note"', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails
            loading={false}
            stepDataDetails={{
              note: mockRule.note,
              description: mockRule.description,
            }}
            stepData={mockRule}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('EuiButtonGroup[idSelected="details"]').exists()).toBeTruthy();
      expect(wrapper.find('EuiButtonGroup[idSelected="notes"]').exists()).toBeFalsy();

      wrapper
        .find('input[title="Investigation guide"]')
        .at(0)
        .simulate('change', { target: { value: 'notes' } });

      expect(wrapper.find('EuiButtonGroup[idSelected="details"]').exists()).toBeFalsy();
      expect(wrapper.find('EuiButtonGroup[idSelected="notes"]').exists()).toBeTruthy();
    });

    test('it displays notes markdown when user toggles to "notes"', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <StepAboutRuleToggleDetails
            loading={false}
            stepDataDetails={{
              note: mockRule.note,
              description: mockRule.description,
            }}
            stepData={mockRule}
          />
        </ThemeProvider>
      );

      wrapper
        .find('input[title="Investigation guide"]')
        .at(0)
        .simulate('change', { target: { value: 'notes' } });

      expect(wrapper.find('EuiButtonGroup[idSelected="notes"]').exists()).toBeTruthy();
      expect(wrapper.find('Markdown h1').text()).toEqual('this is some markdown documentation');
    });
  });
});
