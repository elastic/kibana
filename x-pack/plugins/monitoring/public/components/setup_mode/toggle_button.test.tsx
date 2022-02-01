/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SetupModeToggleButton } from './toggle_button';

describe('ToggleButton', () => {
  it('should render properly', () => {
    const component = shallow(<SetupModeToggleButton enabled={true} toggleSetupMode={jest.fn()} />);
    expect(component).toMatchSnapshot();
  });

  it('should show a loading state', () => {
    const component = shallow(<SetupModeToggleButton enabled={true} toggleSetupMode={jest.fn()} />);

    component.find('EuiButton').simulate('click');

    expect(component.find('EuiButton').prop('isLoading')).toBe(true);
  });

  it('should call toggleSetupMode', () => {
    const toggleSetupMode = jest.fn();
    const component = shallow(
      <SetupModeToggleButton enabled={true} toggleSetupMode={toggleSetupMode} />
    );

    component.find('EuiButton').simulate('click');
    expect(toggleSetupMode).toHaveBeenCalledWith(true);
  });

  it('should render the exit setup mode button when disabled', () => {
    const toggleSetupMode = jest.fn();
    const component = shallow(
      <SetupModeToggleButton enabled={false} toggleSetupMode={toggleSetupMode} />
    );
    expect(component).toMatchSnapshot();
  });
});
