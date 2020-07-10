/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';

import { RecentActivity, RecentActivityItem } from './recent_activity';
import { defaultServerData } from './overview';

jest.mock('../../../shared/telemetry', () => ({ sendTelemetry: jest.fn() }));
import { sendTelemetry } from '../../../shared/telemetry';

const org = { name: 'foo', defaultOrgName: 'bar' };

const feed = [
  {
    id: 'demo',
    sourceId: 'd2d2d23d',
    message: 'was successfully connected',
    target: 'http://localhost:3002/ws/org/sources',
    timestamp: '2020-06-24 16:34:16',
  },
];

describe('RecentActivity', () => {
  it('renders with no feed data', () => {
    const wrapper = shallow(<RecentActivity {...defaultServerData} activityFeed={[]} />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);

    // Branch coverage - renders without error for custom org name
    shallow(<RecentActivity {...defaultServerData} organization={org} activityFeed={[]} />);
  });

  it('renders an activity feed with links', () => {
    const wrapper = shallow(<RecentActivity {...defaultServerData} activityFeed={feed} />);
    const activity = wrapper.find(RecentActivityItem).dive();

    expect(activity).toHaveLength(1);

    const link = activity.find('[data-test-subj="viewSourceDetailsLink"]');
    link.simulate('click');
    expect(sendTelemetry).toHaveBeenCalled();
  });

  it('renders activity item error state', () => {
    const props = { ...feed[0], status: 'error' };
    const wrapper = shallow(<RecentActivityItem {...props} />);

    expect(wrapper.find('.activity--error')).toHaveLength(1);
    expect(wrapper.find('.activity--error__label')).toHaveLength(1);
    expect(wrapper.find(EuiLink).prop('color')).toEqual('danger');
  });
});
