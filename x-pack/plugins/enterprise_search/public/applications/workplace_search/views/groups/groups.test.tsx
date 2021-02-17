/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__';
import { groups } from '../../__mocks__/groups.mock';
import { meta } from '../../__mocks__/meta.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFieldSearch, EuiLoadingSpinner } from '@elastic/eui';

import { DEFAULT_META } from '../../../shared/constants';
import { FlashMessages } from '../../../shared/flash_messages';
import { Loading } from '../../../shared/loading';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { AddGroupModal } from './components/add_group_modal';
import { ClearFiltersLink } from './components/clear_filters_link';
import { GroupsTable } from './components/groups_table';
import { TableFilters } from './components/table_filters';
import { Groups } from './groups';

const getSearchResults = jest.fn();
const openNewGroupModal = jest.fn();
const resetGroups = jest.fn();
const setFilterValue = jest.fn();
const setActivePage = jest.fn();

const mockSuccessMessage = {
  type: 'success',
  message: 'group added',
};

const mockValues = {
  groups,
  groupsDataLoading: false,
  newGroupModalOpen: false,
  newGroup: null,
  groupListLoading: false,
  hasFiltersSet: false,
  groupsMeta: meta,
  filteredSources: [],
  filteredUsers: [],
  filterValue: '',
  isFederatedAuth: false,
};

describe('GroupOverview', () => {
  beforeEach(() => {
    setMockActions({
      getSearchResults,
      openNewGroupModal,
      resetGroups,
      setFilterValue,
      setActivePage,
    });
    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<Groups />);

    expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
    expect(wrapper.find(GroupsTable)).toHaveLength(1);
    expect(wrapper.find(TableFilters)).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...mockValues, groupsDataLoading: true });
    const wrapper = shallow(<Groups />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('gets search results when filters changed', () => {
    const wrapper = shallow(<Groups />);

    const filters = wrapper.find(TableFilters).dive().shallow();
    const input = filters.find(EuiFieldSearch);

    input.simulate('change', { target: { value: 'Query' } });

    expect(getSearchResults).toHaveBeenCalledWith(true);
  });

  it('renders manage button when new group added', () => {
    setMockValues({
      ...mockValues,
      newGroup: { name: 'group', id: '123' },
      messages: [mockSuccessMessage],
    });
    const wrapper = shallow(<Groups />);
    const flashMessages = wrapper.find(FlashMessages).dive().shallow();

    expect(flashMessages.find('[data-test-subj="NewGroupManageButton"]')).toHaveLength(1);
  });

  it('renders ClearFiltersLink when filters set', () => {
    setMockValues({
      ...mockValues,
      hasFiltersSet: true,
      groupsMeta: DEFAULT_META,
    });

    const wrapper = shallow(<Groups />);

    expect(wrapper.find(ClearFiltersLink)).toHaveLength(1);
  });

  it('renders inviteUsersButton when not federated auth', () => {
    setMockValues({
      ...mockValues,
      isFederatedAuth: false,
    });

    const wrapper = shallow(<Groups />);

    const Action: React.FC = () =>
      wrapper.find(ViewContentHeader).props().action as React.ReactElement<any, any> | null;
    const action = shallow(<Action />);

    expect(action.find('[data-test-subj="InviteUsersButton"]')).toHaveLength(1);
    expect(action.find(EuiButtonTo)).toHaveLength(1);
  });

  it('does not render inviteUsersButton when federated auth', () => {
    setMockValues({
      ...mockValues,
      isFederatedAuth: true,
    });

    const wrapper = shallow(<Groups />);

    const Action: React.FC = () =>
      wrapper.find(ViewContentHeader).props().action as React.ReactElement<any, any> | null;
    const action = shallow(<Action />);

    expect(action.find('[data-test-subj="InviteUsersButton"]')).toHaveLength(0);
  });

  it('renders EuiLoadingSpinner when loading', () => {
    setMockValues({
      ...mockValues,
      groupListLoading: true,
    });

    const wrapper = shallow(<Groups />);

    expect(wrapper.find(EuiLoadingSpinner)).toHaveLength(1);
  });

  it('renders AddGroupModal', () => {
    setMockValues({
      ...mockValues,
      newGroupModalOpen: true,
    });

    const wrapper = shallow(<Groups />);

    expect(wrapper.find(AddGroupModal)).toHaveLength(1);
  });
});
