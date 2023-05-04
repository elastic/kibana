/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';

import { AllRule, FieldRule } from '../../model';
import { AddRuleButton } from './add_rule_button';

describe('AddRuleButton', () => {
  it('allows a field rule to be created', () => {
    const props = {
      onClick: jest.fn(),
    };

    const wrapper = mountWithIntl(<AddRuleButton {...props} />);
    findTestSubject(wrapper, 'roleMappingsAddRuleButton').simulate('click');
    expect(findTestSubject(wrapper, 'addRuleContextMenu')).toHaveLength(1);

    // EUI renders this ID twice, so we need to target the button itself
    wrapper.find('button[id="addRuleOption"]').simulate('click');

    expect(props.onClick).toHaveBeenCalledTimes(1);

    const [newRule] = props.onClick.mock.calls[0];
    expect(newRule).toBeInstanceOf(FieldRule);
    expect(newRule.toRaw()).toEqual({
      field: { username: '*' },
    });
  });

  it('allows a rule group to be created', () => {
    const props = {
      onClick: jest.fn(),
    };

    const wrapper = mountWithIntl(<AddRuleButton {...props} />);
    findTestSubject(wrapper, 'roleMappingsAddRuleButton').simulate('click');
    expect(findTestSubject(wrapper, 'addRuleContextMenu')).toHaveLength(1);

    // EUI renders this ID twice, so we need to target the button itself
    wrapper.find('button[id="addRuleGroupOption"]').simulate('click');

    expect(props.onClick).toHaveBeenCalledTimes(1);

    const [newRule] = props.onClick.mock.calls[0];
    expect(newRule).toBeInstanceOf(AllRule);
    expect(newRule.toRaw()).toEqual({
      all: [{ field: { username: '*' } }],
    });
  });
});
