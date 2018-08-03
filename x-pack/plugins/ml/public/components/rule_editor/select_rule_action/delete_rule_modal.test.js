/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { DeleteRuleModal } from './delete_rule_modal';

describe('DeleteRuleModal', () => {

  const deleteRuleAtIndex = jest.fn(() => {});

  const requiredProps = {
    ruleIndex: 0,
    deleteRuleAtIndex,
  };

  test('renders as delete button when not visible', () => {
    const props = {
      ...requiredProps,
    };

    const component = shallow(
      <DeleteRuleModal {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('renders modal after clicking delete rule link', () => {
    const props = {
      ...requiredProps,
    };

    const wrapper = shallow(<DeleteRuleModal {...props} />);
    wrapper.find('EuiLink').simulate('click');
    wrapper.update();
    expect(wrapper).toMatchSnapshot();

  });

  test('renders as delete button after opening and closing modal', () => {
    const props = {
      ...requiredProps,
    };

    const wrapper = shallow(<DeleteRuleModal {...props} />);
    wrapper.find('EuiLink').simulate('click');
    const instance = wrapper.instance();
    instance.closeModal();
    wrapper.update();
    expect(wrapper).toMatchSnapshot();

  });

});
