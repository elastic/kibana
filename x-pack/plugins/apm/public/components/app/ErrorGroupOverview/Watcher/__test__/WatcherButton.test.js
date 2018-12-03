/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import DetailView from '../WatcherButton';

jest.mock('ui/chrome', () => ({
  addBasePath: path => `myBasePath${path}`
}));

describe('WatcherButton', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = shallow(<DetailView />);
  });

  it('should render initial state', () => {
    expect(wrapper).toMatchSnapshot();
  });

  it('should have correct url', () => {
    const panels = wrapper.find('EuiContextMenu').prop('panels');
    expect(panels[0].items[1].href).toBe(
      'myBasePath/app/kibana#/management/elasticsearch/watcher/'
    );
  });

  it('popover should be closed', () => {
    expect(wrapper.find('EuiPopover').prop('isOpen')).toBe(false);
  });

  it('should open popover', async () => {
    await wrapper.instance().onButtonClick();
    wrapper.update();
    expect(wrapper.find('EuiPopover').prop('isOpen')).toBe(true);
  });
});
