/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { shallow, mount } from 'enzyme';
import { EventLogListCellRenderer, DEFAULT_DATE_FORMAT } from './event_log_list_cell_renderer';
import { EventLogListStatus } from './event_log_list_status';
import { RuleDurationFormat } from '../../../rules_list/components/rule_duration_format';

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    location: {
      pathname: '/logs',
    },
  }),
}));

jest.mock('../../../../../common/lib/kibana', () => ({
  useSpacesData: () => ({
    spacesMap: new Map([
      ['space1', { id: 'space1' }],
      ['space2', { id: 'space2' }],
    ]),
    activeSpaceId: 'space1',
  }),
  useKibana: () => ({
    services: {
      http: {
        basePath: {
          get: () => '/basePath',
        },
      },
    },
  }),
}));

describe('rule_event_log_list_cell_renderer', () => {
  const savedLocation = window.location;
  beforeAll(() => {
    // @ts-ignore Mocking window.location
    delete window.location;
    // @ts-ignore
    window.location = Object.assign(
      new URL('https://localhost/app/management/insightsAndAlerting/triggersActions/logs'),
      {
        ancestorOrigins: '',
        assign: jest.fn(),
        reload: jest.fn(),
        replace: jest.fn(),
      }
    );
  });
  afterAll(() => {
    window.location = savedLocation;
  });

  it('renders primitive values correctly', () => {
    const wrapper = mount(<EventLogListCellRenderer columnId="message" value="test" />);

    expect(wrapper.text()).toEqual('test');
  });

  it('renders undefined correctly', () => {
    const wrapper = shallow(<EventLogListCellRenderer columnId="message" />);

    expect(wrapper.text()).toBeFalsy();
  });

  it('renders date duration correctly', () => {
    const wrapper = shallow(
      <EventLogListCellRenderer columnId="execution_duration" value="100000" />
    );

    expect(wrapper.find(RuleDurationFormat).exists()).toBeTruthy();
    expect(wrapper.find(RuleDurationFormat).props().duration).toEqual(100000);
  });

  it('renders alert count correctly', () => {
    const wrapper = shallow(
      <EventLogListCellRenderer columnId="num_new_alerts" value="3" version="8.3.0" />
    );

    expect(wrapper.text()).toEqual('3');
  });

  it('renders timestamps correctly', () => {
    const time = '2022-03-20T07:40:44-07:00';
    const wrapper = shallow(<EventLogListCellRenderer columnId="timestamp" value={time} />);

    expect(wrapper.text()).toEqual(moment(time).format(DEFAULT_DATE_FORMAT));
  });

  it('renders alert status correctly', () => {
    const wrapper = shallow(<EventLogListCellRenderer columnId="status" value="success" />);

    expect(wrapper.find(EventLogListStatus).exists()).toBeTruthy();
    expect(wrapper.find(EventLogListStatus).props().status).toEqual('success');
  });

  it('unaccounted status will still render, but with the unknown color', () => {
    const wrapper = mount(<EventLogListCellRenderer columnId="status" value="newOutcome" />);

    expect(wrapper.find(EventLogListStatus).exists()).toBeTruthy();
    expect(wrapper.find(EventLogListStatus).text()).toEqual('newOutcome');
    expect(wrapper.find(EuiIcon).props().color).toEqual('gray');
  });

  it('links to rules on the correct space', () => {
    const wrapper1 = shallow(
      <EventLogListCellRenderer
        columnId="rule_name"
        value="Rule"
        ruleId="1"
        spaceIds={['space1']}
      />
    );
    // @ts-ignore data-href is not a native EuiLink prop
    expect(wrapper1.find(EuiLink).props()['data-href']).toEqual('/rule/1');
    const wrapper2 = shallow(
      <EventLogListCellRenderer
        columnId="rule_name"
        value="Rule"
        ruleId="1"
        spaceIds={['space2']}
      />
    );
    // @ts-ignore data-href is not a native EuiLink prop
    expect(wrapper2.find(EuiLink).props()['data-href']).toEqual(
      '/basePath/s/space2/app/management/insightsAndAlerting/triggersActions/rule/1'
    );

    window.location = savedLocation;
  });
});
