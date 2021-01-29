/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';
import { groups } from '../../../__mocks__/groups.mock';

import React from 'react';
import { shallow } from 'enzyme';
import moment from 'moment';

import { GroupRow, NO_USERS_MESSAGE, NO_SOURCES_MESSAGE } from './group_row';
import { GroupUsers } from './group_users';

import { EuiTableRow } from '@elastic/eui';

describe('GroupRow', () => {
  beforeEach(() => {
    setMockValues({ isFederatedAuth: true });
  });

  it('renders', () => {
    const wrapper = shallow(<GroupRow {...groups[0]} />);

    expect(wrapper.find(EuiTableRow)).toHaveLength(1);
  });

  it('renders group users', () => {
    setMockValues({ isFederatedAuth: false });
    const wrapper = shallow(<GroupRow {...groups[0]} />);

    expect(wrapper.find(GroupUsers)).toHaveLength(1);
  });

  it('renders fromNow date string when in range', () => {
    const wrapper = shallow(
      <GroupRow {...groups[0]} updatedAt={moment().subtract(7, 'days').format()} />
    );

    expect(wrapper.find('small').text()).toEqual('Last updated 7 days ago.');
  });

  it('renders formatted date string when out of range', () => {
    const wrapper = shallow(<GroupRow {...groups[0]} updatedAt={'2020-01-01'} />);

    expect(wrapper.find('small').text()).toEqual('Last updated January 1, 2020.');
  });

  it('renders empty users message when no users present', () => {
    setMockValues({ isFederatedAuth: false });
    const wrapper = shallow(<GroupRow {...groups[0]} usersCount={0} />);

    expect(wrapper.find('.user-group__accounts').text()).toEqual(NO_USERS_MESSAGE);
  });

  it('renders empty sources message when no sources present', () => {
    const wrapper = shallow(<GroupRow {...groups[0]} contentSources={[]} />);

    expect(wrapper.find('.user-group__sources').text()).toEqual(NO_SOURCES_MESSAGE);
  });
});
