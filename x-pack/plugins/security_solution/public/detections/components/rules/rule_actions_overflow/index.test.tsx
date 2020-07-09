/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';

import {
  deleteRulesAction,
  duplicateRulesAction,
} from '../../../pages/detection_engine/rules/all/actions';
import { RuleActionsOverflow } from './index';
import { mockRule } from '../../../pages/detection_engine/rules/all/__mocks__/mock';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../../../pages/detection_engine/rules/all/actions', () => ({
  deleteRulesAction: jest.fn(),
  duplicateRulesAction: jest.fn(),
}));

describe('RuleActionsOverflow', () => {
  describe('snapshots', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
      );
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('rules details menu panel', () => {
    test('there is at least one item when there is a rule within the rules-details-menu-panel', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
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
      const wrapper = mount(<RuleActionsOverflow rule={null} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-menu-panel"]').first().prop('items')
      ).toEqual([]);
    });

    test('items are empty when there is an undefined rule within the rules-details-menu-panel', () => {
      const wrapper = mount(<RuleActionsOverflow rule={null} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-menu-panel"]').first().prop('items')
      ).toEqual([]);
    });

    test('it opens the popover when rules-details-popover-button-icon is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
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
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={true} />
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
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={true} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="rules-details-delete-rule"] button').exists()).toEqual(
        false
      );
    });

    test('it opens the popover when rules-details-popover-button-icon is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(true);
    });

    test('it closes the popover when rules-details-duplicate-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(false);
    });

    test('it calls duplicateRulesAction when rules-details-duplicate-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
      wrapper.update();
      expect(duplicateRulesAction).toHaveBeenCalled();
    });

    test('it calls duplicateRulesAction with the rule and rule.id when rules-details-duplicate-rule is clicked', () => {
      const rule = mockRule('id');
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-duplicate-rule"] button').simulate('click');
      wrapper.update();
      expect(duplicateRulesAction).toHaveBeenCalledWith(
        [rule],
        [rule.id],
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('rules details export rule', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked and the user does not have permission', () => {
      const rule = mockRule('id');
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={true} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="rules-details-export-rule"] button').exists()).toEqual(
        false
      );
    });

    test('it closes the popover when rules-details-export-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(false);
    });

    test('it sets the rule.rule_id on the generic downloader when rules-details-export-rule is clicked', () => {
      const rule = mockRule('id');
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-generic-downloader"]').prop('ids')
      ).toEqual([rule.rule_id]);
    });

    test('it does not close the pop over on rules-details-export-rule when the rule is an immutable rule and the user does a click', () => {
      const rule = mockRule('id');
      rule.immutable = true;
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-popover"]').first().prop('isOpen')
      ).toEqual(true);
    });

    test('it does not set the rule.rule_id on rules-details-export-rule when the rule is an immutable rule', () => {
      const rule = mockRule('id');
      rule.immutable = true;
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-export-rule"] button').simulate('click');
      wrapper.update();
      expect(
        wrapper.find('[data-test-subj="rules-details-generic-downloader"]').prop('ids')
      ).toEqual([]);
    });
  });

  describe('rules details delete rule', () => {
    test('it does not open the popover when rules-details-popover-button-icon is clicked and the user does not have permission', () => {
      const rule = mockRule('id');
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={true} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      expect(wrapper.find('[data-test-subj="rules-details-delete-rule"] button').exists()).toEqual(
        false
      );
    });

    test('it closes the popover when rules-details-delete-rule is clicked', () => {
      const wrapper = mount(
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
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
        <RuleActionsOverflow rule={mockRule('id')} userHasNoPermissions={false} />
      );
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
      wrapper.update();
      expect(deleteRulesAction).toHaveBeenCalled();
    });

    test('it calls deleteRulesAction with the rule.id when rules-details-delete-rule is clicked', () => {
      const rule = mockRule('id');
      const wrapper = mount(<RuleActionsOverflow rule={rule} userHasNoPermissions={false} />);
      wrapper.find('[data-test-subj="rules-details-popover-button-icon"] button').simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="rules-details-delete-rule"] button').simulate('click');
      wrapper.update();
      expect(deleteRulesAction).toHaveBeenCalledWith(
        [rule.id],
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    });
  });
});
