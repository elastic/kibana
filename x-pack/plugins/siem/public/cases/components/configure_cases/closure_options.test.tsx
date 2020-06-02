/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { ClosureOptions, ClosureOptionsProps } from './closure_options';
import { TestProviders } from '../../../common/mock';
import { ClosureOptionsRadio } from './closure_options_radio';

describe('ClosureOptions', () => {
  let wrapper: ReactWrapper;
  const onChangeClosureType = jest.fn();
  const props: ClosureOptionsProps = {
    disabled: false,
    closureTypeSelected: 'close-by-user',
    onChangeClosureType,
  };

  beforeAll(() => {
    wrapper = mount(<ClosureOptions {...props} />, { wrappingComponent: TestProviders });
  });

  test('it shows the closure options form group', () => {
    expect(
      wrapper.find('[data-test-subj="case-closure-options-form-group"]').first().exists()
    ).toBe(true);
  });

  test('it shows the closure options form row', () => {
    expect(wrapper.find('[data-test-subj="case-closure-options-form-row"]').first().exists()).toBe(
      true
    );
  });

  test('it shows closure options', () => {
    expect(wrapper.find('[data-test-subj="case-closure-options-radio"]').first().exists()).toBe(
      true
    );
  });

  test('it pass the correct props to child', () => {
    const closureOptionsRadioComponent = wrapper.find(ClosureOptionsRadio);
    expect(closureOptionsRadioComponent.props().disabled).toEqual(false);
    expect(closureOptionsRadioComponent.props().closureTypeSelected).toEqual('close-by-user');
    expect(closureOptionsRadioComponent.props().onChangeClosureType).toEqual(onChangeClosureType);
  });

  test('the closure type is changed successfully', () => {
    wrapper.find('input[id="close-by-pushing"]').simulate('change');

    expect(onChangeClosureType).toHaveBeenCalledWith('close-by-pushing');
  });
});
