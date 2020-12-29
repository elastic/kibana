/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import * as redux from 'react-redux';
import moment from 'moment';
import { PageHeader } from '../page_header';
import { Ping } from '../../../../../common/runtime_types';
import { createMemoryHistory } from 'history';
import { renderWithRouter } from '../../../../lib';

jest.mock('react-redux', () => {
  const originalModule = jest.requireActual('react-redux');

  return {
    ...originalModule,
    useSelector: jest.fn(),
  };
});

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
    jest.spyOn(redux, 'useDispatch').mockReturnValue(jest.fn());
    jest.spyOn(redux, 'useSelector').mockReturnValue(defaultMonitorStatus);
  });

  it('shallow renders with the date picker', () => {
    const component = renderWithRouter(<PageHeader />);
    expect(component).toMatchSnapshot('page_header_with_date_picker');
  });

  it('shallow renders without the date picker', () => {
    const component = renderWithRouter(<PageHeader />);
    expect(component).toMatchSnapshot('page_header_no_date_picker');
  });

  it('shallow renders extra links', () => {
    const component = renderWithRouter(<PageHeader />);
    expect(component).toMatchSnapshot('page_header_with_extra_links');
  });

  it('renders null when on a step detail page', () => {
    const history = createMemoryHistory();
    // navigate to step page
    history.push('/journey/1/step/1');
    const component = renderWithRouter(<PageHeader />, history);
    expect(component.html()).toBe(null);
  });

  it('renders monitor header without tabs when on a monitor page', () => {
    const history = createMemoryHistory();
    // navigate to monitor page
    history.push('/monitor/1');
    const component = renderWithRouter(<PageHeader />, history);
    expect(component.find('h1').text()).toBe(monitorName);
    expect(component.find('[data-test-subj="uptimeTabs"]').length).toBe(0);
  });

  it('renders tabs when not on a monitor or step detail page', () => {
    const history = createMemoryHistory();
    const component = renderWithRouter(<PageHeader />, history);
    expect(component.find('[data-test-subj="uptimeTabs"]').length).toBe(1);
  });
});
