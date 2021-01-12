/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import moment from 'moment';
import { Ping } from '../../../../common/runtime_types';
import { mockReduxHooks } from '../../../lib/helper/test_helpers';
import { render } from '../../../lib/helper/rtl_helpers';
import { PageTabs } from './page_tabs';
import { createMemoryHistory } from 'history';

describe('PageTabs', () => {
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

  it('it renders all tabs', () => {
    const { getByText } = render(<PageTabs />);
    expect(getByText('Overview')).toBeInTheDocument();
    expect(getByText('Certificates')).toBeInTheDocument();
    expect(getByText('Settings')).toBeInTheDocument();
  });

  it('it keep params while switching', () => {
    const { getByTestId } = render(<PageTabs />, {
      history: createMemoryHistory({
        initialEntries: ['/settings/?g=%22%22&dateRangeStart=now-10m&dateRangeEnd=now'],
      }),
    });
    expect(getByTestId('uptimeSettingsToOverviewLink')).toHaveAttribute(
      'href',
      '/?dateRangeStart=now-10m'
    );
    expect(getByTestId('uptimeCertificatesLink')).toHaveAttribute(
      'href',
      '/certificates?dateRangeStart=now-10m'
    );
    expect(getByTestId('settings-page-link')).toHaveAttribute(
      'href',
      '/settings?dateRangeStart=now-10m'
    );
  });

  it('it resets params on overview if already on overview', () => {
    const { getByTestId } = render(<PageTabs />, {
      history: createMemoryHistory({
        initialEntries: ['/?g=%22%22&dateRangeStart=now-10m&dateRangeEnd=now'],
      }),
    });
    expect(getByTestId('uptimeSettingsToOverviewLink')).toHaveAttribute('href', '/');
  });
});
