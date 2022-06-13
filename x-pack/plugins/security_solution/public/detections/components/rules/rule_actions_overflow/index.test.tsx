/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';

import {
  goToRuleEditPage,
  executeRulesBulkAction,
} from '../../../pages/detection_engine/rules/all/actions';
import { RuleActionsOverflow } from './index';
import { mockRule } from '../../../pages/detection_engine/rules/all/__mocks__/mock';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/lib/kibana', () => {
  const actual = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...actual,
    useKibana: jest.fn().mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
        },
      },
    }),
  };
});
jest.mock('../../../pages/detection_engine/rules/all/actions');

const executeRulesBulkActionMock = executeRulesBulkAction as jest.Mock;
const flushPromises = () => new Promise(setImmediate);

describe('RuleActionsOverflow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('snapshots', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('rules details menu panel', () => {
    test('there is at least one item when there is a rule within the rules-details-menu-panel', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      const items: unknown[] = wrapper
        .find('[data-test-subj="rules-details-menu-panel"]')
        .first()
        .prop('items');

      expect(items.length).toBeGreaterThan(0);
    });

    test('items are empty when there is a null rule within the rules-details-menu-panel', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={null} userHasPermissions canDuplicateRuleWithActions={true} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-menu-panel"]').first().prop('items')
      ).toEqual([]);
    });

    test('items are empty when there is an undefined rule within the rules-details-menu-panel', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={null} userHasPermissions canDuplicateRuleWithActions={true} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-menu-panel"]').first().prop('items')
      ).toEqual([]);
    });

    test('it opens the popover when rules-details-popover-button-icon is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(true);
    });
  });

  describe('rules details pop over button icon', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked when the user does not have permission', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions={false}
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(false);
    });
  });

  describe('rules details duplicate rule', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked and the user does not have permission', () => {
      const rule = mockRule('id');
      const wrapper = mount(
        <RuleActionsOverflow
          rule={rule}
          userHasPermissions={false}
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="rules-details-delete-rule"] button').exists()).toEqual(
        false
      );
    });

    test('it opens the popover when rules-details-popover-button-icon is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(true);
    });

    test('it closes the popover when rules-details-duplicate-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(false);
    });

    test('it calls duplicate action when rules-details-duplicate-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
      wrapper.update();
      expect(executeRulesBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'duplicate' })
      );
    });

    test('it calls duplicate action with the rule and rule.id when rules-details-duplicate-rule is clicked', () => {
      const rule = mockRule('id');
      const wrapper = mount(
        <RuleActionsOverflow rule={rule} userHasPermissions canDuplicateRuleWithActions={true} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
      wrapper.update();
      expect(executeRulesBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'duplicate', search: { ids: ['id'] } })
      );
    });
  });

  test('it navigates to edit page after the rule is duplicated', async () => {
    const rule = mockRule('id');
    const ruleDuplicate = mockRule('newRule');
    executeRulesBulkActionMock.mockImplementation(() =>
      Promise.resolve({ attributes: { results: { created: [ruleDuplicate] } } })
    );
    const wrapper = mount(
      <RuleActionsOverflow rule={rule} userHasPermissions canDuplicateRuleWithActions={true} />
    );
    wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
    wrapper.update();
    wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
    wrapper.update();
    await flushPromises();

    expect(executeRulesBulkAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'duplicate' })
    );
    expect(goToRuleEditPage).toHaveBeenCalledWith(ruleDuplicate.id, expect.anything());
  });

  describe('rules details export rule', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked and the user does not have permission', () => {
      const rule = mockRule('id');
      const wrapper = mount(
        <RuleActionsOverflow
          rule={rule}
          userHasPermissions={false}
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="rules-details-export-rule"] button').exists()).toEqual(
        false
      );
    });

    test('it closes the popover when rules-details-export-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(false);
    });

    test('it does not close the pop over on rules-details-export-rule when the rule is an immutable rule and the user does a click', () => {
      const rule = mockRule('id');
      rule.immutable = true;
      const wrapper = mount(
        <RuleActionsOverflow rule={rule} userHasPermissions canDuplicateRuleWithActions={true} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(true);
    });
  });

  describe('rules details delete rule', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked and the user does not have permission', () => {
      const rule = mockRule('id');
      const wrapper = mount(
        <RuleActionsOverflow
          rule={rule}
          userHasPermissions={false}
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="rules-details-delete-rule"] button').exists()).toEqual(
        false
      );
    });

    test('it closes the popover when rules-details-delete-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(false);
    });

    test('it calls deleteRulesAction when rules-details-delete-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow
          rule={mockRule('id')}
          userHasPermissions
          canDuplicateRuleWithActions={true}
        />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
      wrapper.update();
      expect(executeRulesBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'delete' })
      );
    });

    test('it calls deleteRulesAction with the rule.id when rules-details-delete-rule is clicked', () => {
      const rule = mockRule('id');
      const wrapper = mount(
        <RuleActionsOverflow rule={rule} userHasPermissions canDuplicateRuleWithActions={true} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
      wrapper.update();
      expect(executeRulesBulkAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'delete', search: { ids: ['id'] } })
      );
    });
  });
});
