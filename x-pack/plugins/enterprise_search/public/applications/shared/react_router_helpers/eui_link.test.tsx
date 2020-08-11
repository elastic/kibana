/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { EuiLink, EuiButton } from '@elastic/eui';

import '../../__mocks__/react_router_history.mock';
import { mockHistory } from '../../__mocks__';

import { EuiReactRouterLink, EuiReactRouterButton } from './eui_link';

describe('EUI & React Router Component Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<EuiReactRouterLink to="/" />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });

  it('renders an EuiButton', () => {
    const wrapper = shallow(<EuiReactRouterButton to="/" />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('passes down all ...rest props', () => {
    const wrapper = shallow(<EuiReactRouterLink to="/" data-test-subj="foo" external={true} />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('external')).toEqual(true);
    expect(link.prop('data-test-subj')).toEqual('foo');
  });

  it('renders with the correct href and onClick props', () => {
    const wrapper = mount(<EuiReactRouterLink to="/foo/bar" />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('onClick')).toBeInstanceOf(Function);
    expect(link.prop('href')).toEqual('/enterprise_search/foo/bar');
    expect(mockHistory.createHref).toHaveBeenCalled();
  });

  describe('onClick', () => {
    it('prevents default navigation and uses React Router history', () => {
      const wrapper = mount(<EuiReactRouterLink to="/bar/baz" />);

      const simulatedEvent = {
        button: 0,
        target: { getAttribute: () => '_self' },
        preventDefault: jest.fn(),
      };
      wrapper.find(EuiLink).simulate('click', simulatedEvent);

      expect(simulatedEvent.preventDefault).toHaveBeenCalled();
      expect(mockHistory.push).toHaveBeenCalled();
    });

    it('does not prevent default browser behavior on new tab/window clicks', () => {
      const wrapper = mount(<EuiReactRouterLink to="/bar/baz" />);

      const simulatedEvent = {
        shiftKey: true,
        target: { getAttribute: () => '_blank' },
      };
      wrapper.find(EuiLink).simulate('click', simulatedEvent);

      expect(mockHistory.push).not.toHaveBeenCalled();
    });
  });
});
