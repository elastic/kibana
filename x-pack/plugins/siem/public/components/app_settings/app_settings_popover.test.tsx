/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { noop } from 'lodash/fp';
import * as React from 'react';

import { AppSettingsPopover } from './app_settings_popover';

describe('AppSettingsPopover', () => {
  describe('rendering', () => {
    test('it renders against snapshot', () => {
      const wrapper = shallow(
        <AppSettingsPopover onClick={noop} onClose={noop} showPopover={false} />
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders a settings gear icon', () => {
      const wrapper = mount(
        <AppSettingsPopover onClick={noop} onClose={noop} showPopover={false} />
      );

      expect(wrapper.find('[data-test-subj="gear"]').exists()).toEqual(true);
    });
  });

  describe('onClick', () => {
    test('it invokes onClick when clicked', () => {
      const onClick = jest.fn();

      const wrapper = mount(
        <AppSettingsPopover onClick={onClick} onClose={noop} showPopover={false} />
      );

      wrapper
        .find('[data-test-subj="gear"]')
        .first()
        .simulate('click');

      expect(onClick).toHaveBeenCalled();
    });
  });
});
