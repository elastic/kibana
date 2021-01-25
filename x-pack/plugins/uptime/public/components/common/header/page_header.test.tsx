/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { PageHeader } from './page_header';
import { Ping } from '../../../../common/runtime_types';
import { renderWithRouter } from '../../../lib';
import { mockReduxHooks } from '../../../lib/helper/test_helpers';

describe('PageHeader', () => {
  const monitorName = 'sample monitor';
  const defaultMonitorId = 'always-down';

  const defaultMonitorStatus: Ping = {
    docId: 'few213kl',
    timestamp: moment(new Date()).subtract(15, 'm').toString(),
    monitor: {
      duration: {
        us: 1234567,
      },
      id: defaultMonitorId,
      status: 'up',
      type: 'http',
      name: monitorName,
    },
    url: {
      full: 'https://www.elastic.co/',
    },
  };

  beforeEach(() => {
    mockReduxHooks(defaultMonitorStatus);
  });

  it('does not render dynamic elements by default', () => {
    const component = renderWithRouter(<PageHeader />);

    expect(component.find('[data-test-subj="superDatePickerShowDatesButton"]').length).toBe(0);
    expect(component.find('[data-test-subj="certificatesRefreshButton"]').length).toBe(0);
    expect(component.find('[data-test-subj="monitorTitle"]').length).toBe(0);
    expect(component.find('[data-test-subj="uptimeTabs"]').length).toBe(0);
  });

  it('shallow renders with the date picker', () => {
    const component = renderWithRouter(<PageHeader showDatePicker />);
    expect(component.find('[data-test-subj="superDatePickerShowDatesButton"]').length).toBe(1);
  });

  it('shallow renders with certificate refresh button', () => {
    const component = renderWithRouter(<PageHeader showCertificateRefreshBtn />);
    expect(component.find('[data-test-subj="certificatesRefreshButton"]').length).toBe(1);
  });

  it('renders monitor title when showMonitorTitle', () => {
    const component = renderWithRouter(<PageHeader showMonitorTitle />);
    expect(component.find('[data-test-subj="monitorTitle"]').length).toBe(1);
    expect(component.find('h1').text()).toBe(monitorName);
  });

  it('renders tabs when showTabs is true', () => {
    const component = renderWithRouter(<PageHeader showTabs />);
    expect(component.find('[data-test-subj="uptimeTabs"]').length).toBe(1);
  });
});
