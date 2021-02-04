/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTelemetryActions } from '../../../__mocks__';
import './__mocks__/overview_logic.mock';
import { setMockValues } from './__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { RecentActivity, RecentActivityItem } from './recent_activity';

const organization = { name: 'foo', defaultOrgName: 'bar' };

const activityFeed = [
  {
    id: 'demo',
    sourceId: 'd2d2d23d',
    message: 'was successfully connected',
    target: 'http://localhost:3002/ws/org/sources',
    timestamp: '2020-06-24 16:34:16',
  },
];

describe('RecentActivity', () => {
  it('renders with no activityFeed data', () => {
    const wrapper = shallow(<RecentActivity />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);

    // Branch coverage - renders without error for custom org name
    setMockValues({ organization });
    shallow(<RecentActivity />);
  });

  it('renders an activityFeed with links', () => {
    setMockValues({ activityFeed });
    const wrapper = shallow(<RecentActivity />);
    const activity = wrapper.find(RecentActivityItem).dive();

    expect(activity).toHaveLength(1);

    const link = activity.find('[data-test-subj="viewSourceDetailsLink"]');
    link.simulate('click');
    expect(mockTelemetryActions.sendWorkplaceSearchTelemetry).toHaveBeenCalled();
  });

  it('renders activity item error state', () => {
    const props = { ...activityFeed[0], status: 'error' };
    const wrapper = shallow(<RecentActivityItem {...props} />);

    expect(wrapper.find('.activity--error')).toHaveLength(1);
    expect(wrapper.find('.activity--error__label')).toHaveLength(1);
    expect(wrapper.find(EuiLink).prop('color')).toEqual('danger');
  });

  it('renders recent activity message for default org name', () => {
    setMockValues({
      organization: {
        name: 'foo',
        defaultOrgName: 'foo',
      },
    });
    const wrapper = shallow(<RecentActivity />);
    const emptyPrompt = wrapper.find(EuiEmptyPrompt).dive();

    expect(emptyPrompt.find(FormattedMessage).prop('defaultMessage')).toEqual(
      'Your organization has no recent activity'
    );
  });
});
