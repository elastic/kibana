/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SetupModeEnterButton } from './enter_button';

describe('EnterButton', () => {
  it('should render properly', () => {
    const component = shallow(<SetupModeEnterButton enabled={true} toggleSetupMode={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('should show a loading state', () => {
    const component = shallow(<SetupModeEnterButton enabled={true} toggleSetupMode={jest.fn()} />);

    component.find('EuiButton').simulate('click');

    expect(component.find('EuiButton').prop('isLoading')).toBe(true);
  });

  it('should call toggleSetupMode', () => {
    const toggleSetupMode = jest.fn();
    const component = shallow(
      <SetupModeEnterButton enabled={true} toggleSetupMode={toggleSetupMode} />
    );

    component.find('EuiButton').simulate('click');
    expect(toggleSetupMode).toHaveBeenCalledWith(true);
  });

  it('should not render if not enabled', () => {
    const toggleSetupMode = jest.fn();
    const component = shallow(
      <SetupModeEnterButton enabled={false} toggleSetupMode={toggleSetupMode} />
    );
    expect(component.html()).toBe(null);
  });
});
