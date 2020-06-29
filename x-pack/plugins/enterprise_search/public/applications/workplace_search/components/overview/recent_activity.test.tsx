/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiEmptyPrompt } from '@elastic/eui';

import { RecentActivity } from './recent_activity';
import { defaultServerData } from './overview';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

const org = { name: 'foo', defaultOrgName: 'bar' };

const feed = [
  {
    id: 'demo',
    message: 'was successfully connected',
    target: 'http://localhost:3002/ws/org/sources',
    timestamp: '2020-06-24 16:34:16',
  },
];

describe('RecentActivity', () => {
  it('renders with no feed data', () => {
    const wrapper = shallow(<RecentActivity {...defaultServerData} activityFeed={[]} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('renders name when changed', () => {
    const wrapper = shallow(
      <RecentActivity {...defaultServerData} organization={org} activityFeed={[]} />
    );

    const title = shallow(wrapper.find(EuiEmptyPrompt).prop('title') as any);
    expect(title.text()).toBe('foo has no recent activity');
  });

  it('renders additional cards for federated auth', () => {
    const wrapper = shallow(<RecentActivity {...defaultServerData} activityFeed={feed} />);

    expect(wrapper.find('table')).toHaveLength(1);
  });

  it('renders feed item with error', () => {
    const feedWithError = [
      {
        ...feed[0],
        status: 'error',
      },
    ];
    const wrapper = shallow(<RecentActivity {...defaultServerData} activityFeed={feedWithError} />);

    expect(wrapper.find('tr.activity__error')).toHaveLength(1);
    const button = wrapper.find('[data-test-subj="viewSourceDetailsButton"]');

    button.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });
});
