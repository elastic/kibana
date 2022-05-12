/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';

import { findTestSubject, mountWithIntl, nextTick, shallowWithIntl } from '@kbn/test-jest-helpers';

import { AllRule, AnyRule, ExceptAnyRule, FieldRule } from '../../model';
import { AddRuleButton } from './add_rule_button';
import { FieldRuleEditor } from './field_rule_editor';
import { RuleGroupEditor } from './rule_group_editor';

describe('RuleGroupEditor', () => {
  it('renders an empty group', () => {
    const props = {
      rule: new AllRule([]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = shallowWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(0);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(0);
    expect(wrapper.find(AddRuleButton)).toHaveLength(1);
  });

  it('allows the group type to be changed, maintaining child rules', async () => {
    const props = {
      rule: new AllRule([new FieldRule('username', '*')]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(1);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AddRuleButton)).toHaveLength(1);
    expect(findTestSubject(wrapper, 'deleteRuleGroupButton')).toHaveLength(1);

    const anyRule = new AnyRule();

    findTestSubject(wrapper, 'ruleGroupTitle').simulate('click');
    await nextTick();
    wrapper.update();

    const anyRuleOption = wrapper.find(EuiContextMenuItem).filterWhere((menuItem) => {
      return menuItem.text() === anyRule.getDisplayTitle();
    });

    anyRuleOption.simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [newRule] = props.onChange.mock.calls[0];
    expect(newRule).toBeInstanceOf(AnyRule);
    expect(newRule.toRaw()).toEqual(new AnyRule([new FieldRule('username', '*')]).toRaw());
  });

  it('warns when changing group types which would invalidate child rules', async () => {
    const props = {
      rule: new AllRule([new ExceptAnyRule([new FieldRule('my_custom_field', 'foo*')])]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(2);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AddRuleButton)).toHaveLength(2);
    expect(findTestSubject(wrapper, 'deleteRuleGroupButton')).toHaveLength(2);

    const anyRule = new AnyRule();

    findTestSubject(wrapper, 'ruleGroupTitle').first().simulate('click');
    await nextTick();
    wrapper.update();

    const anyRuleOption = wrapper.find(EuiContextMenuItem).filterWhere((menuItem) => {
      return menuItem.text() === anyRule.getDisplayTitle();
    });

    anyRuleOption.simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
    expect(findTestSubject(wrapper, 'confirmRuleChangeModal')).toHaveLength(1);
    findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(1);
    const [newRule] = props.onChange.mock.calls[0];
    expect(newRule).toBeInstanceOf(AnyRule);

    // new rule should a defaulted field sub rule, as the existing rules are not valid for the new type
    expect(newRule.toRaw()).toEqual(new AnyRule([new FieldRule('username', '*')]).toRaw());
  });

  it('does not change groups when canceling the confirmation', async () => {
    const props = {
      rule: new AllRule([new ExceptAnyRule([new FieldRule('username', '*')])]),
      allowAdd: true,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = mountWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(RuleGroupEditor)).toHaveLength(2);
    expect(wrapper.find(FieldRuleEditor)).toHaveLength(1);
    expect(wrapper.find(AddRuleButton)).toHaveLength(2);
    expect(findTestSubject(wrapper, 'deleteRuleGroupButton')).toHaveLength(2);

    const anyRule = new AnyRule();

    findTestSubject(wrapper, 'ruleGroupTitle').first().simulate('click');
    await nextTick();
    wrapper.update();

    const anyRuleOption = wrapper.find(EuiContextMenuItem).filterWhere((menuItem) => {
      return menuItem.text() === anyRule.getDisplayTitle();
    });

    anyRuleOption.simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
    expect(findTestSubject(wrapper, 'confirmRuleChangeModal')).toHaveLength(1);
    findTestSubject(wrapper, 'confirmModalCancelButton').simulate('click');

    expect(props.onChange).toHaveBeenCalledTimes(0);
  });

  it('hides the add rule button when instructed to', () => {
    const props = {
      rule: new AllRule([]),
      allowAdd: false,
      ruleDepth: 0,
      onChange: jest.fn(),
      onDelete: jest.fn(),
    };
    const wrapper = shallowWithIntl(<RuleGroupEditor {...props} />);
    expect(wrapper.find(AddRuleButton)).toHaveLength(0);
  });
});
