/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { GroupsFilterPopoverComponent } from './groups_filter_popover';
import { mockSiemJobs } from '../../__mocks__/api';
import { SiemJob } from '../../types';
import { cloneDeep } from 'lodash/fp';

describe('GroupsFilterPopover', () => {
  let siemJobs: SiemJob[];

  beforeEach(() => {
    siemJobs = cloneDeep(mockSiemJobs);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <GroupsFilterPopoverComponent siemJobs={siemJobs} onSelectedGroupsChanged={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('when a filter is clicked, it becomes checked ', () => {
    const mockOnSelectedGroupsChanged = jest.fn();
    const wrapper = mount(
      <GroupsFilterPopoverComponent
        siemJobs={siemJobs}
        onSelectedGroupsChanged={mockOnSelectedGroupsChanged}
      />
    );

    wrapper
      .find('[data-test-subj="groups-filter-popover-button"]')
      .first()
      .simulate('click');
    wrapper.update();

    wrapper
      .find('EuiFilterSelectItem')
      .first()
      .simulate('click');
    wrapper.update();

    expect(
      wrapper
        .find('EuiFilterSelectItem')
        .first()
        .prop('checked')
    ).toEqual('on');
  });
});
