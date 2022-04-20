/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiIcon } from '@elastic/eui';
import { Tls } from '../../../../common/runtime_types';
import { MonitorSSLCertificate } from './status_bar';
import * as redux from 'react-redux';
import { mountWithRouter, renderWithRouter, shallowWithRouter } from '../../../lib';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';

describe('SSL Certificate component', () => {
  let monitorTls: Tls;
  const dateInTwoMonths = moment().add(2, 'month').toString();
  const yesterday = moment().subtract(1, 'day').toString();

  beforeEach(() => {
    monitorTls = {
      certificate_not_valid_after: dateInTwoMonths,
      certificate_not_valid_before: yesterday,
    };

    const useDispatchSpy = jest.spyOn(redux, 'useDispatch');
    useDispatchSpy.mockReturnValue(jest.fn());

    const useSelectorSpy = jest.spyOn(redux, 'useSelector');
    useSelectorSpy.mockReturnValue({ settings: DYNAMIC_SETTINGS_DEFAULTS });
  });

  it('shallow renders', () => {
    const monitorTls1 = {
      certificate_not_valid_after: '2020-04-24T11:41:38.200Z',
      certificate_not_valid_before: '2019-04-24T11:41:38.200Z',
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
      certificate_not_valid_after: 'i am so invalid date',
      certificate_not_valid_before: 'i am so invalid date',
    };
    const component = renderWithRouter(<MonitorSSLCertificate tls={monitorTls} />);
    expect(component).toMatchSnapshot();
  });

  it('renders expiration date with a warning state if ssl expiry date is less than 5 days', () => {
    const dateIn5Days = moment().add(5, 'day').toString();
    monitorTls = {
      certificate_not_valid_after: dateIn5Days,
      certificate_not_valid_before: yesterday,
    };
    const component = mountWithRouter(<MonitorSSLCertificate tls={monitorTls} />);

    const lockIcon = component.find(EuiIcon);

    expect(lockIcon.props().color).toBe('warning');

    const componentText = component.find('h4');
    expect(componentText.text()).toBe('Expires soon ' + moment(dateIn5Days).fromNow());
  });

  it('does not render the expiration date with a warning state if expiry date is greater than a month', () => {
    const dateIn40Days = moment().add(40, 'day').toString();
    monitorTls = {
      certificate_not_valid_after: dateIn40Days,
      certificate_not_valid_before: yesterday,
    };
    const component = mountWithRouter(<MonitorSSLCertificate tls={monitorTls} />);

    const lockIcon = component.find(EuiIcon);
    expect(lockIcon.props().color).toBe('success');

    const componentText = component.find('h4');
    expect(componentText.text()).toBe('Expires ' + moment(dateIn40Days).fromNow());
  });
});
