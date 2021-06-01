/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { groups } from '../../__mocks__/groups.mock';

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetWorkplaceSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { GroupOverview } from './components/group_overview';
import { GroupSourcePrioritization } from './components/group_source_prioritization';
import { ManageUsersModal } from './components/manage_users_modal';
import { SharedSourcesModal } from './components/shared_sources_modal';
import { GroupRouter } from './group_router';

describe('GroupRouter', () => {
  const initializeGroup = jest.fn();
  const resetGroup = jest.fn();

  beforeEach(() => {
    setMockValues({
      sharedSourcesModalVisible: false,
      manageUsersModalVisible: false,
      group: groups[0],
    });

    setMockActions({
      initializeGroup,
      resetGroup,
    });
  });
  it('renders', () => {
    const wrapper = shallow(<GroupRouter />);

    expect(wrapper.find(FlashMessages)).toHaveLength(1);
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(2);
    expect(wrapper.find(GroupOverview)).toHaveLength(1);
    expect(wrapper.find(GroupSourcePrioritization)).toHaveLength(1);
  });

  it('renders modals', () => {
    setMockValues({
      sharedSourcesModalVisible: true,
      manageUsersModalVisible: true,
      group: groups[0],
    });

    const wrapper = shallow(<GroupRouter />);

    expect(wrapper.find(ManageUsersModal)).toHaveLength(1);
    expect(wrapper.find(SharedSourcesModal)).toHaveLength(1);
  });

  it('handles breadcrumbs while loading', () => {
    setMockValues({
      sharedSourcesModalVisible: false,
      manageUsersModalVisible: false,
      group: {},
    });

    const loadingBreadcrumbs = ['Groups', '...'];

    const wrapper = shallow(<GroupRouter />);

    const firstBreadCrumb = wrapper.find(SetPageChrome).first();
    const lastBreadCrumb = wrapper.find(SetPageChrome).last();

    expect(firstBreadCrumb.prop('trail')).toEqual([...loadingBreadcrumbs, 'Source Prioritization']);
    expect(lastBreadCrumb.prop('trail')).toEqual(loadingBreadcrumbs);
  });
});
