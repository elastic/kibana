/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';
import { EuiLink, EuiButton } from '@elastic/eui';

import '../../../../lib/__mocks__/ut_router_history.mock';

import { ReactRouterEuiLink, ReactRouterEuiButton } from '../link_for_eui';
import { mockHistory } from '../../../../lib/__mocks__/ut_router_history.mock';

describe('EUI & React Router Component Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    const wrapper = shallow(<ReactRouterEuiLink to="/" />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });

  it('renders an EuiButton', () => {
    const wrapper = shallow(<ReactRouterEuiButton to="/" />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('passes down all ...rest props', () => {
    const wrapper = shallow(<ReactRouterEuiLink to="/" data-test-subj="foo" external={true} />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('external')).toEqual(true);
    expect(link.prop('data-test-subj')).toEqual('foo');
  });

  it('renders with the correct href and onClick props', () => {
    const wrapper = mount(<ReactRouterEuiLink to="/foo/bar" />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('onClick')).toBeInstanceOf(Function);
    expect(link.prop('href')).toEqual('/enterprise_search/foo/bar');
    expect(mockHistory.createHref).toHaveBeenCalled();
  });

  describe('onClick', () => {
    it('prevents default navigation and uses React Router history', () => {
      const wrapper = mount(<ReactRouterEuiLink to="/bar/baz" />);

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
      const wrapper = mount(<ReactRouterEuiLink to="/bar/baz" />);

      const simulatedEvent = {
        shiftKey: true,
        target: { getAttribute: () => '_blank' },
      };
      wrapper.find(EuiLink).simulate('click', simulatedEvent);

      expect(mockHistory.push).not.toHaveBeenCalled();
    });
  });
});
