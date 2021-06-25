/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/enterprise_search_url.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiPopover, EuiPopoverTitle, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { shallowWithIntl } from '../../test_helpers';

import { BetaNotification, appendBetaNotificationItem } from './beta';

describe('BetaNotification', () => {
  const getToggleButton = (wrapper: ShallowWrapper) => {
    return shallow(<div>{wrapper.prop('button')}</div>).childAt(0);
  };

  it('renders', () => {
    const wrapper = shallow(<BetaNotification />);

    expect(wrapper.type()).toEqual(EuiPopover);
    expect(wrapper.find(EuiPopoverTitle).prop('children')).toEqual(
      'Enterprise Search in Kibana is a beta user interface'
    );
  });

  describe('open/close popover state', () => {
    const wrapper = shallow(<BetaNotification />);

    it('is initially closed', () => {
      expect(wrapper.find(EuiPopover).prop('isOpen')).toBe(false);
    });

    it('opens the popover when the toggle button is pressed', () => {
      getToggleButton(wrapper).simulate('click');

      expect(wrapper.find(EuiPopover).prop('isOpen')).toBe(true);
    });

    it('closes the popover', () => {
      wrapper.prop('closePopover')();

      expect(wrapper.find(EuiPopover).prop('isOpen')).toBe(false);
    });
  });

  describe('links', () => {
    const wrapper = shallowWithIntl(<BetaNotification />);
    const links = wrapper.find(FormattedMessage).dive();

    it('renders a documentation link', () => {
      const docLink = links.find(EuiLink).first();

      expect(docLink.prop('href')).toContain('/user-interfaces.html');
    });

    it('renders a link back to the standalone UI', () => {
      const switchLink = links.find(EuiLink).last();

      expect(switchLink.prop('href')).toBe('http://localhost:3002');
    });
  });
});
