/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { EuiBadge } from '@elastic/eui';
import { Tls } from '../../../../../common/runtime_types';
import { MonitorSSLCertificate } from '../monitor_status_bar';
import * as redux from 'react-redux';
import { mountWithRouter, renderWithRouter, shallowWithRouter } from '../../../../lib';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../../common/constants';

describe('SSL Certificate component', () => {
  let monitorTls: Tls;

  beforeEach(() => {
    const dateInTwoMonths = moment()
      .add(2, 'month')
      .toString();

    monitorTls = {
      not_after: dateInTwoMonths,
    };

    const useDispatchSpy = jest.spyOn(redux, 'useDispatch');
    useDispatchSpy.mockReturnValue(jest.fn());

    const useSelectorSpy = jest.spyOn(redux, 'useSelector');
    useSelectorSpy.mockReturnValue({ settings: DYNAMIC_SETTINGS_DEFAULTS });
  });

  it('shallow renders', () => {
    const monitorTls1 = {
      not_after: '2020-04-24T11:41:38.200Z',
    };
    const component = shallowWithRouter(<MonitorSSLCertificate tls={monitorTls1} />);
    expect(component).toMatchSnapshot();
  });

  it('renders', () => {
    const component = renderWithRouter(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });

  it('renders null if invalid date', () => {
    monitorTls = {
      not_after: 'i am so invalid date',
    };
    const component = renderWithRouter(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });

  it('renders expiration date with a warning state if ssl expiry date is less than 5 days', () => {
    const dateIn5Days = moment()
      .add(5, 'day')
      .toString();
    monitorTls = {
      not_after: dateIn5Days,
    };
    const component = mountWithRouter(<MonitorSSLCertificate tls={monitorTls} />);

    const badgeComponent = component.find(EuiBadge);

    expect(badgeComponent.props().color).toBe('warning');

    const badgeComponentText = component.find('.euiBadge__text');
    expect(badgeComponentText.text()).toBe(moment(dateIn5Days).fromNow());

    expect(badgeComponent.find('span.euiBadge--warning')).toBeTruthy();
  });

  it('does not render the expiration date with a warning state if expiry date is greater than a month', () => {
    const dateIn40Days = moment()
      .add(40, 'day')
      .toString();
    monitorTls = {
      not_after: dateIn40Days,
    };
    const component = mountWithRouter(<MonitorSSLCertificate tls={monitorTls} />);

    const badgeComponent = component.find(EuiBadge);
    expect(badgeComponent.props().color).toBe('default');

    const badgeComponentText = component.find('.euiBadge__text');
    expect(badgeComponentText.text()).toBe(moment(dateIn40Days).fromNow());

    expect(badgeComponent.find('span.euiBadge--warning')).toHaveLength(0);
  });
});
