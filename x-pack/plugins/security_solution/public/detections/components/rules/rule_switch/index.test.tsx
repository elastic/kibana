/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { enableRules } from '../../../containers/detection_engine/rules';
import { RuleSwitchComponent } from './index';
import { getRulesSchemaMock } from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import { useStateToaster, displayErrorToast } from '../../../../common/components/toasters';
import { useRulesTableContextOptional } from '../../../pages/detection_engine/rules/all/rules_table/rules_table_context';
import { useRulesTableContextMock } from '../../../pages/detection_engine/rules/all/rules_table/__mocks__/rules_table_context';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/components/toasters');
jest.mock('../../../containers/detection_engine/rules');
jest.mock('../../../pages/detection_engine/rules/all/rules_table/rules_table_context');

describe('RuleSwitch', () => {
  beforeEach(() => {
    (useStateToaster as jest.Mock).mockImplementation(() => [[], jest.fn()]);
    (enableRules as jest.Mock).mockResolvedValue([getRulesSchemaMock()]);
    (useRulesTableContextOptional as jest.Mock).mockReturnValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders loader if "isLoading" is true', () => {
    const wrapper = mount(<RuleSwitchComponent enabled={true} id={'7'} isLoading />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="ruleSwitchLoader"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleSwitch"]').exists()).toBeFalsy();
  });

  test('it renders switch disabled if "isDisabled" is true', () => {
    const wrapper = mount(<RuleSwitchComponent enabled={true} id={'7'} isDisabled />, {
      wrappingComponent: TestProviders,
    });

    expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(0).props().disabled).toBeTruthy();
  });

  test('it renders switch enabled if "enabled" is true', () => {
    const wrapper = mount(<RuleSwitchComponent enabled id={'7'} />, {
      wrappingComponent: TestProviders,
    });
    expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(0).props().checked).toBeTruthy();
  });

  test('it renders switch disabled if "enabled" is false', () => {
    const wrapper = mount(<RuleSwitchComponent enabled={false} id={'7'} />, {
      wrappingComponent: TestProviders,
    });
    expect(wrapper.find('[data-test-subj="ruleSwitch"]').at(0).props().checked).toBeFalsy();
  });

  test('it dispatches error toaster if "enableRules" call rejects', async () => {
    const mockError = new Error('uh oh');
    (enableRules as jest.Mock).mockRejectedValue(mockError);

    const wrapper = mount(<RuleSwitchComponent enabled={false} isDisabled={false} id={'7'} />, {
      wrappingComponent: TestProviders,
    });
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

    const wrapper = mount(<RuleSwitchComponent enabled={false} isDisabled={false} id={'7'} />, {
      wrappingComponent: TestProviders,
    });
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(displayErrorToast).toHaveBeenCalledTimes(1);
    });
  });

  test('it calls "setLoadingRules" if in rules table context', async () => {
    const rulesTableContext = useRulesTableContextMock.create();
    (useRulesTableContextOptional as jest.Mock).mockReturnValue(rulesTableContext);

    const wrapper = mount(<RuleSwitchComponent enabled isDisabled={false} id={'7'} />, {
      wrappingComponent: TestProviders,
    });
    wrapper.find('[data-test-subj="ruleSwitch"]').at(2).simulate('click');

    await waitFor(() => {
      wrapper.update();
      expect(rulesTableContext.actions.setLoadingRules).toHaveBeenCalledTimes(1);
    });
  });
});
