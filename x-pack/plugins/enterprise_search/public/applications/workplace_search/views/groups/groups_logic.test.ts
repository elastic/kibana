/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';
import { contentSources } from '../../__mocks__/content_sources.mock';
import { groups } from '../../__mocks__/groups.mock';
import { users } from '../../__mocks__/users.mock';
import { mockGroupsValues } from './__mocks__/groups_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { JSON_HEADER as headers } from '../../../../../common/constants';
import { DEFAULT_META } from '../../../shared/constants';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { GroupsLogic } from './groups_logic';

// We need to mock out the debounced functionality
const TIMEOUT = 400;

describe('GroupsLogic', () => {
  const { mount } = new LogicMounter(GroupsLogic);
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;

  const groupsResponse = {
    results: groups,
    meta: DEFAULT_META,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(GroupsLogic.values).toEqual(mockGroupsValues);
  });

  describe('actions', () => {
    describe('onInitializeGroups', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.onInitializeGroups({ contentSources, users });

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          groupsDataLoading: false,
          contentSources,
          users,
        });
      });
    });

    describe('setSearchResults', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.setSearchResults(groupsResponse);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          groups,
          groupListLoading: false,
          newGroupName: '',
          groupsMeta: DEFAULT_META,
        });
      });
    });

    describe('addFilteredSource', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredSource('foo');
        GroupsLogic.actions.addFilteredSource('bar');
        GroupsLogic.actions.addFilteredSource('baz');

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          hasFiltersSet: true,
          filteredSources: ['bar', 'baz', 'foo'],
        });
      });
    });

    describe('removeFilteredSource', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredSource('foo');
        GroupsLogic.actions.addFilteredSource('bar');
        GroupsLogic.actions.addFilteredSource('baz');
        GroupsLogic.actions.removeFilteredSource('foo');

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          hasFiltersSet: true,
          filteredSources: ['bar', 'baz'],
        });
      });
    });

    describe('addFilteredUser', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredUser('foo');
        GroupsLogic.actions.addFilteredUser('bar');
        GroupsLogic.actions.addFilteredUser('baz');

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          hasFiltersSet: true,
          filteredUsers: ['bar', 'baz', 'foo'],
        });
      });
    });

    describe('removeFilteredUser', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredUser('foo');
        GroupsLogic.actions.addFilteredUser('bar');
        GroupsLogic.actions.addFilteredUser('baz');
        GroupsLogic.actions.removeFilteredUser('foo');

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          hasFiltersSet: true,
          filteredUsers: ['bar', 'baz'],
        });
      });
    });

    describe('setGroupUsers', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.setGroupUsers(users);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          allGroupUsersLoading: false,
          allGroupUsers: users,
        });
      });
    });

    describe('setAllGroupLoading', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.setAllGroupLoading(true);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          allGroupUsersLoading: true,
          allGroupUsers: [],
        });
      });
    });

    describe('setFilterValue', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.setFilterValue('foo');

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          filterValue: 'foo',
        });
      });
    });

    describe('setNewGroupName', () => {
      it('sets reducer', () => {
        const NEW_NAME = 'new name';
        GroupsLogic.actions.setNewGroupName(NEW_NAME);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          newGroupName: NEW_NAME,
          newGroupNameErrors: [],
        });
      });
    });

    describe('setNewGroup', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.setNewGroup(groups[0]);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          newGroupModalOpen: false,
          newGroup: groups[0],
          newGroupNameErrors: [],
          filteredSources: [],
          filteredUsers: [],
          groupsMeta: DEFAULT_META,
        });
      });
    });

    describe('setNewGroupFormErrors', () => {
      it('sets reducer', () => {
        const errors = ['this is an error'];
        GroupsLogic.actions.setNewGroupFormErrors(errors);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          newGroupNameErrors: errors,
        });
      });
    });

    describe('closeNewGroupModal', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.closeNewGroupModal();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          newGroupNameErrors: [],
          newGroupName: '',
          newGroupModalOpen: false,
        });
      });
    });

    describe('closeFilterSourcesDropdown', () => {
      it('sets reducer', () => {
        // Open dropdown first
        GroupsLogic.actions.toggleFilterSourcesDropdown();
        GroupsLogic.actions.closeFilterSourcesDropdown();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          filterSourcesDropdownOpen: false,
        });
      });
    });

    describe('closeFilterUsersDropdown', () => {
      it('sets reducer', () => {
        // Open dropdown first
        GroupsLogic.actions.toggleFilterUsersDropdown();
        GroupsLogic.actions.closeFilterUsersDropdown();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          filterUsersDropdownOpen: false,
        });
      });
    });

    describe('setGroupsLoading', () => {
      it('sets reducer', () => {
        // Set to false first
        GroupsLogic.actions.setSearchResults(groupsResponse);
        GroupsLogic.actions.setGroupsLoading();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          groups,
          groupListLoading: true,
        });
      });
    });

    describe('resetGroups', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.resetGroups();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          newGroup: null,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('initializeGroups', () => {
      it('calls API and sets values', async () => {
        const onInitializeGroupsSpy = jest.spyOn(GroupsLogic.actions, 'onInitializeGroups');
        http.get.mockReturnValue(Promise.resolve(groupsResponse));

        GroupsLogic.actions.initializeGroups();
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/groups');
        await nextTick();
        expect(onInitializeGroupsSpy).toHaveBeenCalledWith(groupsResponse);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        GroupsLogic.actions.initializeGroups();
      });
    });

    describe('getSearchResults', () => {
      const search = {
        query: '',
        content_source_ids: [],
        user_ids: [],
      };

      const payload = {
        body: JSON.stringify({
          page: {
            current: 1,
            size: 10,
          },
          search,
        }),
        headers,
      };

      beforeAll(() => {
        jest.useFakeTimers();
      });

      afterAll(() => {
        jest.useRealTimers();
      });

      it('calls API and sets values', async () => {
        const setSearchResultsSpy = jest.spyOn(GroupsLogic.actions, 'setSearchResults');
        http.post.mockReturnValue(Promise.resolve(groups));

        GroupsLogic.actions.getSearchResults();
        jest.advanceTimersByTime(TIMEOUT);
        await nextTick();
        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/groups/search', payload);
        expect(setSearchResultsSpy).toHaveBeenCalledWith(groups);
      });

      it('calls API and resets pagination', async () => {
        // Set active page to 2 to confirm resetting sends the `payload` value of 1 for the current page.
        GroupsLogic.actions.setActivePage(2);
        const setSearchResultsSpy = jest.spyOn(GroupsLogic.actions, 'setSearchResults');
        http.post.mockReturnValue(Promise.resolve(groups));

        GroupsLogic.actions.getSearchResults(true);
        // Account for `breakpoint` that debounces filter value.
        jest.advanceTimersByTime(TIMEOUT);
        await nextTick();
        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/groups/search', payload);
        expect(setSearchResultsSpy).toHaveBeenCalledWith(groups);
      });

      it('handles error', async () => {
        http.post.mockReturnValue(Promise.reject('this is an error'));

        GroupsLogic.actions.getSearchResults();
        jest.advanceTimersByTime(TIMEOUT);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('fetchGroupUsers', () => {
      it('calls API and sets values', async () => {
        const setGroupUsersSpy = jest.spyOn(GroupsLogic.actions, 'setGroupUsers');
        http.get.mockReturnValue(Promise.resolve(users));

        GroupsLogic.actions.fetchGroupUsers('123');
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/groups/123/group_users');
        await nextTick();
        expect(setGroupUsersSpy).toHaveBeenCalledWith(users);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        GroupsLogic.actions.fetchGroupUsers('123');
      });
    });

    describe('saveNewGroup', () => {
      it('calls API and sets values', async () => {
        const GROUP_NAME = 'new group';
        GroupsLogic.actions.setNewGroupName(GROUP_NAME);
        const setNewGroupSpy = jest.spyOn(GroupsLogic.actions, 'setNewGroup');
        http.post.mockReturnValue(Promise.resolve(groups[0]));

        GroupsLogic.actions.saveNewGroup();
        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/groups', {
          body: JSON.stringify({ group_name: GROUP_NAME }),
          headers,
        });
        await nextTick();
        expect(setNewGroupSpy).toHaveBeenCalledWith(groups[0]);
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        GroupsLogic.actions.saveNewGroup();
      });
    });

    describe('setActivePage', () => {
      it('sets reducer', () => {
        const getSearchResultsSpy = jest.spyOn(GroupsLogic.actions, 'getSearchResults');
        const activePage = 3;
        GroupsLogic.actions.setActivePage(activePage);

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          groupsMeta: {
            ...DEFAULT_META,
            page: {
              ...DEFAULT_META.page,
              current: activePage,
            },
          },
        });

        expect(getSearchResultsSpy).toHaveBeenCalled();
      });
    });

    describe('openNewGroupModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.openNewGroupModal();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          newGroupModalOpen: true,
          newGroup: null,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('resetGroupsFilters', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.resetGroupsFilters();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          filteredSources: [],
          filteredUsers: [],
          filterValue: '',
          groupsMeta: DEFAULT_META,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('toggleFilterSourcesDropdown', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.toggleFilterSourcesDropdown();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          filterSourcesDropdownOpen: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('toggleFilterUsersDropdown', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.toggleFilterUsersDropdown();

        expect(GroupsLogic.values).toEqual({
          ...mockGroupsValues,
          filterUsersDropdownOpen: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
  });
});
