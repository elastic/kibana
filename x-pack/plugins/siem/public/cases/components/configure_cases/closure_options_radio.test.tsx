/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';

import { ClosureOptionsRadio, ClosureOptionsRadioComponentProps } from './closure_options_radio';
import { TestProviders } from '../../../common/mock';

describe('ClosureOptionsRadio', () => {
  let wrapper: ReactWrapper;
  const onChangeClosureType = jest.fn();
  const props: ClosureOptionsRadioComponentProps = {
    disabled: false,
    closureTypeSelected: 'close-by-user',
    onChangeClosureType,
  };

  beforeAll(() => {
    wrapper = mount(<ClosureOptionsRadio {...props} />, { wrappingComponent: TestProviders });
  });

  test('it renders', () => {
    expect(wrapper.find('[data-test-subj="closure-options-radio-group"]').first().exists()).toBe(
      true
    );
  });

  test('it shows the correct number of radio buttons', () => {
    expect(wrapper.find('input[name="closure_options"]')).toHaveLength(2);
  });

  test('it renders close by user radio button', () => {
    expect(wrapper.find('input[id="close-by-user"]').exists()).toBeTruthy();
  });

  test('it renders close by pushing radio button', () => {
    expect(wrapper.find('input[id="close-by-pushing"]').exists()).toBeTruthy();
  });

  test('it disables the close by user radio button', () => {
    const newWrapper = mount(<ClosureOptionsRadio {...props} disabled={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find('input[id="close-by-user"]').prop('disabled')).toEqual(true);
  });

  test('it disables correctly the close by pushing radio button', () => {
    const newWrapper = mount(<ClosureOptionsRadio {...props} disabled={true} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find('input[id="close-by-pushing"]').prop('disabled')).toEqual(true);
  });

  test('it selects the correct radio button', () => {
    const newWrapper = mount(
      <ClosureOptionsRadio {...props} closureTypeSelected={'close-by-pushing'} />,
      {
        wrappingComponent: TestProviders,
      }
    );
    expect(newWrapper.find('input[id="close-by-pushing"]').prop('checked')).toEqual(true);
  });

  test('it calls the onChangeClosureType function', () => {
    wrapper.find('input[id="close-by-pushing"]').simulate('change');
    wrapper.update();
    expect(onChangeClosureType).toHaveBeenCalled();
    expect(onChangeClosureType).toHaveBeenCalledWith('close-by-pushing');
  });
});
