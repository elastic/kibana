/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mount } from 'enzyme';
import { ClosablePopoverTitle } from './closable_popover_title';

describe('closable popover title', () => {
  it('renders with defined options', () => {
    const onClose = jest.fn();
    const children = <div className="foo" />;
    const wrapper = mount(
      <ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>
    );
    expect(wrapper.contains(<div className="foo" />)).toBeTruthy();
  });

  it('onClose function gets called', () => {
    const onClose = jest.fn();
    const children = <div className="foo" />;
    const wrapper = mount(
      <ClosablePopoverTitle onClose={onClose}>{children}</ClosablePopoverTitle>
    );
    wrapper.find('EuiButtonIcon').simulate('click');
    expect(onClose).toHaveBeenCalled();
  });
});
