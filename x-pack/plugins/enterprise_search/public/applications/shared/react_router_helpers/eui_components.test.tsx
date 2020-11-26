/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/kea.mock';

import React from 'react';
import { shallow, mount } from 'enzyme';
import { EuiLink, EuiButton, EuiPanel } from '@elastic/eui';

import { mockKibanaValues, mockHistory } from '../../__mocks__';

import { EuiLinkTo, EuiButtonTo, EuiPanelTo } from './eui_components';

describe('EUI & React Router Component Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an EuiLink', () => {
    const wrapper = shallow(<EuiLinkTo to="/" />);

    expect(wrapper.find(EuiLink)).toHaveLength(1);
  });

  it('renders an EuiButton', () => {
    const wrapper = shallow(<EuiButtonTo to="/" />);

    expect(wrapper.find(EuiButton)).toHaveLength(1);
  });

  it('renders an EuiPanel', () => {
    const wrapper = shallow(<EuiPanelTo to="/" paddingSize="l" />);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(wrapper.find(EuiPanel).prop('paddingSize')).toEqual('l');
  });

  it('passes down all ...rest props', () => {
    const wrapper = shallow(<EuiLinkTo to="/" data-test-subj="foo" external={true} />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('external')).toEqual(true);
    expect(link.prop('data-test-subj')).toEqual('foo');
  });

  it('renders with the correct href and onClick props', () => {
    const wrapper = mount(<EuiLinkTo to="/foo/bar" />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('onClick')).toBeInstanceOf(Function);
    expect(link.prop('href')).toEqual('/app/enterprise_search/foo/bar');
    expect(mockHistory.createHref).toHaveBeenCalled();
  });

  it('renders with the correct non-basenamed href when shouldNotCreateHref is passed', () => {
    const wrapper = mount(<EuiLinkTo to="/foo/bar" shouldNotCreateHref />);
    const link = wrapper.find(EuiLink);

    expect(link.prop('href')).toEqual('/foo/bar');
    expect(mockHistory.createHref).not.toHaveBeenCalled();
  });

  describe('onClick', () => {
    it('prevents default navigation and uses React Router history', () => {
      const wrapper = mount(<EuiLinkTo to="/bar/baz" />);

      const simulatedEvent = {
        button: 0,
        target: { getAttribute: () => '_self' },
        preventDefault: jest.fn(),
      };
      wrapper.find(EuiLink).simulate('click', simulatedEvent);

      expect(simulatedEvent.preventDefault).toHaveBeenCalled();
      expect(mockKibanaValues.navigateToUrl).toHaveBeenCalled();
    });

    it('does not prevent default browser behavior on new tab/window clicks', () => {
      const wrapper = mount(<EuiLinkTo to="/bar/baz" />);

      const simulatedEvent = {
        shiftKey: true,
        target: { getAttribute: () => '_blank' },
      };
      wrapper.find(EuiLink).simulate('click', simulatedEvent);

      expect(mockKibanaValues.navigateToUrl).not.toHaveBeenCalled();
    });

    it('calls inherited onClick actions in addition to default navigation', () => {
      const customOnClick = jest.fn(); // Can be anything from telemetry to a state reset
      const wrapper = mount(<EuiLinkTo to="/narnia" onClick={customOnClick} />);

      wrapper.find(EuiLink).simulate('click', { shiftKey: true });

      expect(customOnClick).toHaveBeenCalled();
    });
  });
});
