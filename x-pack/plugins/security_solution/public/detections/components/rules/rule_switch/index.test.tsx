/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { waitFor } from '@testing-library/react';

import { enableRules } from '../../../containers/detection_engine/rules';
import { enableRulesAction } from '../../../pages/detection_engine/rules/all/actions';
import { RuleSwitchComponent } from './index';
import { getRulesSchemaMock } from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { RulesSchema } from '../../../../../common/detection_engine/schemas/response/rules_schema';
import { useStateToaster, displayErrorToast } from '../../../../common/components/toasters';

jest.mock('../../../../common/components/toasters');
jest.mock('../../../containers/detection_engine/rules');
jest.mock('../../../pages/detection_engine/rules/all/actions');

describe('RuleSwitch', () => {
  beforeEach(() => {
    (useStateToaster as jest.Mock).mockImplementation(() => [[], jest.fn()]);
    (enableRules as jest.Mock).mockResolvedValue([getRulesSchemaMock()]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders loader if "isLoading" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent optionLabel="rule-switch" enabled={true} id={'7'} isLoading />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="ruleSwitchLoader"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleSwitch"]').exists()).toBeFalsy();
  });

  test('it renders switch disabled if "isDisabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent optionLabel="rule-switch" enabled={true} id={'7'} isDisabled />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(0).props().disabled).toBeTruthy();
  });

  test('it renders switch enabled if "enabled" is true', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent optionLabel="rule-switch" enabled id={'7'} />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(0).props().checked).toBeTruthy();
  });

  test('it renders switch disabled if "enabled" is false', () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent optionLabel="rule-switch" enabled={false} id={'7'} />
      </ThemeProvider>
    );
    expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(0).props().checked).toBeFalsy();
  });

  test('it renders an off switch enabled on click', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent
          optionLabel="rule-switch"
          enabled={false}
          isDisabled={false}
          id={'7'}
        />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(1).props().checked).toBeTruthy();
    });
  });

  test('it renders an on switch off on click', async () => {
    const rule: RulesSchema = { ...getRulesSchemaMock(), enabled: false };

    (enableRules as jest.Mock).mockResolvedValue([rule]);

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent optionLabel="rule-switch" enabled isDisabled={false} id={'7'} />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(1).props().checked).toBeFalsy();
    });
  });

  test('it dispatches error toaster if "enableRules" call rejects', async () => {
    const mockError = new Error('uh oh');
    (enableRules as jest.Mock).mockRejectedValue(mockError);

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent
          optionLabel="rule-switch"
          enabled={false}
          isDisabled={false}
          id={'7'}
        />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(displayErrorToast).toHaveBeenCalledTimes(1);
    });
  });

  test('it dispatches error toaster if "enableRules" call resolves with some errors', async () => {
    (enableRules as jest.Mock).mockResolvedValue([
      getRulesSchemaMock(),
      { error: { status_code: 400, message: 'error' } },
      { error: { status_code: 400, message: 'error' } },
    ]);

    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent
          optionLabel="rule-switch"
          enabled={false}
          isDisabled={false}
          id={'7'}
        />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(displayErrorToast).toHaveBeenCalledTimes(1);
    });
  });

  test('it invokes "enableRulesAction" if dispatch is passed through', async () => {
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>
        <RuleSwitchComponent
          optionLabel="rule-switch"
          enabled
          isDisabled={false}
          id={'7'}
          dispatch={jest.fn()}
        />
      </ThemeProvider>
    );
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(enableRulesAction).toHaveBeenCalledTimes(1);
    });
  });
});
