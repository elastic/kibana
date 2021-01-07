/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

jest.mock('../../../shared/http', () => ({
  HttpLogic: {
    values: { http: { get: jest.fn(), post: jest.fn() } },
  },
}));
import { HttpLogic } from '../../../shared/http';

jest.mock('../../../shared/flash_messages', () => ({
  FlashMessagesLogic: { actions: { clearFlashMessages: jest.fn(), setQueuedMessages: jest.fn() } },
  flashAPIErrors: jest.fn(),
  setSuccessMessage: jest.fn(),
  setQueuedSuccessMessage: jest.fn(),
}));
import { FlashMessagesLogic, flashAPIErrors } from '../../../shared/flash_messages';

import { DEFAULT_META } from '../../../shared/constants';
import { JSON_HEADER as headers } from '../../../../../common/constants';

import { groups } from '../../__mocks__/groups.mock';
import { contentSources } from '../../__mocks__/content_sources.mock';
import { users } from '../../__mocks__/users.mock';
import { mockGroupsValues } from './__mocks__/groups_logic.mock';
import { GroupsLogic } from './groups_logic';

// We need to mock out the debounced functionality
const TIMEOUT = 400;
const delay = () => new Promise((resolve) => setTimeout(resolve, TIMEOUT));

describe('GroupsLogic', () => {
  const clearFlashMessagesSpy = jest.spyOn(FlashMessagesLogic.actions, 'clearFlashMessages');
  const groupsResponse = {
    results: groups,
    meta: DEFAULT_META,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
    GroupsLogic.mount();
  });

  it('has expected default values', () => {
    expect(GroupsLogic.values).toEqual(mockGroupsValues);
  });

  describe('actions', () => {
    describe('onInitializeGroups', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.onInitializeGroups({ contentSources, users });

        expect(GroupsLogic.values.groupsDataLoading).toEqual(false);
        expect(GroupsLogic.values.contentSources).toEqual(contentSources);
        expect(GroupsLogic.values.users).toEqual(users);
      });
    });

    describe('setSearchResults', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.setSearchResults(groupsResponse);

        expect(GroupsLogic.values.groups).toEqual(groups);
        expect(GroupsLogic.values.groupListLoading).toEqual(false);
        expect(GroupsLogic.values.newGroupName).toEqual('');
        expect(GroupsLogic.values.groupsMeta).toEqual(DEFAULT_META);
      });
    });

    describe('addFilteredSource', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredSource('foo');
        GroupsLogic.actions.addFilteredSource('bar');
        GroupsLogic.actions.addFilteredSource('baz');

        expect(GroupsLogic.values.filteredSources).toEqual(['bar', 'baz', 'foo']);
      });
    });

    describe('removeFilteredSource', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredSource('foo');
        GroupsLogic.actions.addFilteredSource('bar');
        GroupsLogic.actions.addFilteredSource('baz');
        GroupsLogic.actions.removeFilteredSource('foo');

        expect(GroupsLogic.values.filteredSources).toEqual(['bar', 'baz']);
      });
    });

    describe('addFilteredUser', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredUser('foo');
        GroupsLogic.actions.addFilteredUser('bar');
        GroupsLogic.actions.addFilteredUser('baz');

        expect(GroupsLogic.values.filteredUsers).toEqual(['bar', 'baz', 'foo']);
      });
    });

    describe('removeFilteredUser', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.addFilteredUser('foo');
        GroupsLogic.actions.addFilteredUser('bar');
        GroupsLogic.actions.addFilteredUser('baz');
        GroupsLogic.actions.removeFilteredUser('foo');

        expect(GroupsLogic.values.filteredUsers).toEqual(['bar', 'baz']);
      });
    });

    describe('setGroupUsers', () => {
      it('sets reducers', () => {
        GroupsLogic.actions.setGroupUsers(users);

        expect(GroupsLogic.values.allGroupUsersLoading).toEqual(false);
        expect(GroupsLogic.values.allGroupUsers).toEqual(users);
      });
    });

    describe('setAllGroupLoading', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.setAllGroupLoading(true);

        expect(GroupsLogic.values.allGroupUsersLoading).toEqual(true);
        expect(GroupsLogic.values.allGroupUsers).toEqual([]);
      });
    });

    describe('setFilterValue', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.setFilterValue('foo');

        expect(GroupsLogic.values.filterValue).toEqual('foo');
      });
    });

    describe('setNewGroupName', () => {
      it('sets reducer', () => {
        const NEW_NAME = 'new name';
        GroupsLogic.actions.setNewGroupName(NEW_NAME);

        expect(GroupsLogic.values.newGroupName).toEqual(NEW_NAME);
        expect(GroupsLogic.values.newGroupNameErrors).toEqual([]);
      });
    });

    describe('setNewGroup', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.setNewGroup(groups[0]);

        expect(GroupsLogic.values.newGroupModalOpen).toEqual(false);
        expect(GroupsLogic.values.newGroup).toEqual(groups[0]);
        expect(GroupsLogic.values.newGroupNameErrors).toEqual([]);
        expect(GroupsLogic.values.filteredSources).toEqual([]);
        expect(GroupsLogic.values.filteredUsers).toEqual([]);
        expect(GroupsLogic.values.groupsMeta).toEqual(DEFAULT_META);
      });
    });

    describe('setNewGroupFormErrors', () => {
      it('sets reducer', () => {
        const errors = ['this is an error'];
        GroupsLogic.actions.setNewGroupFormErrors(errors);

        expect(GroupsLogic.values.newGroupNameErrors).toEqual(errors);
      });
    });

    describe('closeNewGroupModal', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.closeNewGroupModal();

        expect(GroupsLogic.values.newGroupModalOpen).toEqual(false);
        expect(GroupsLogic.values.newGroupName).toEqual('');
        expect(GroupsLogic.values.newGroupNameErrors).toEqual([]);
      });
    });

    describe('closeFilterSourcesDropdown', () => {
      it('sets reducer', () => {
        // Open dropdown first
        GroupsLogic.actions.toggleFilterSourcesDropdown();
        GroupsLogic.actions.closeFilterSourcesDropdown();

        expect(GroupsLogic.values.filterSourcesDropdownOpen).toEqual(false);
      });
    });

    describe('closeFilterUsersDropdown', () => {
      it('sets reducer', () => {
        // Open dropdown first
        GroupsLogic.actions.toggleFilterUsersDropdown();
        GroupsLogic.actions.closeFilterUsersDropdown();

        expect(GroupsLogic.values.filterUsersDropdownOpen).toEqual(false);
      });
    });

    describe('setGroupsLoading', () => {
      it('sets reducer', () => {
        // Set to false first
        GroupsLogic.actions.setSearchResults(groupsResponse);
        GroupsLogic.actions.setGroupsLoading();

        expect(GroupsLogic.values.groupListLoading).toEqual(true);
      });
    });

    describe('resetGroups', () => {
      it('sets reducer', () => {
        GroupsLogic.actions.resetGroups();

        expect(GroupsLogic.values.newGroup).toEqual(null);
      });
    });
  });

  describe('listeners', () => {
    describe('initializeGroups', () => {
      it('calls API and sets values', async () => {
        const onInitializeGroupsSpy = jest.spyOn(GroupsLogic.actions, 'onInitializeGroups');
        const promise = Promise.resolve(groupsResponse);
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.initializeGroups();
        expect(HttpLogic.values.http.get).toHaveBeenCalledWith('/api/workplace_search/groups');
        await promise;
        expect(onInitializeGroupsSpy).toHaveBeenCalledWith(groupsResponse);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.initializeGroups();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
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

      it('calls API and sets values', async () => {
        const setSearchResultsSpy = jest.spyOn(GroupsLogic.actions, 'setSearchResults');
        const promise = Promise.resolve(groups);
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.getSearchResults();
        await delay();
        expect(HttpLogic.values.http.post).toHaveBeenCalledWith(
          '/api/workplace_search/groups/search',
          payload
        );
        await promise;
        expect(setSearchResultsSpy).toHaveBeenCalledWith(groups);
      });

      it('calls API and resets pagination', async () => {
        // Set active page to 2 to confirm resetting sends the `payload` value of 1 for the current page.
        GroupsLogic.actions.setActivePage(2);
        const setSearchResultsSpy = jest.spyOn(GroupsLogic.actions, 'setSearchResults');
        const promise = Promise.resolve(groups);
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.getSearchResults(true);
        // Account for `breakpoint` that debounces filter value.
        await delay();
        expect(HttpLogic.values.http.post).toHaveBeenCalledWith(
          '/api/workplace_search/groups/search',
          payload
        );
        await promise;
        expect(setSearchResultsSpy).toHaveBeenCalledWith(groups);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.getSearchResults();
        try {
          await promise;
        } catch {
          // Account for `breakpoint` that debounces filter value.
          await delay();
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('fetchGroupUsers', () => {
      it('calls API and sets values', async () => {
        const setGroupUsersSpy = jest.spyOn(GroupsLogic.actions, 'setGroupUsers');
        const promise = Promise.resolve(users);
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.fetchGroupUsers('123');
        expect(HttpLogic.values.http.get).toHaveBeenCalledWith(
          '/api/workplace_search/groups/123/group_users'
        );
        await promise;
        expect(setGroupUsersSpy).toHaveBeenCalledWith(users);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.fetchGroupUsers('123');
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('saveNewGroup', () => {
      it('calls API and sets values', async () => {
        const GROUP_NAME = 'new group';
        GroupsLogic.actions.setNewGroupName(GROUP_NAME);
        const setNewGroupSpy = jest.spyOn(GroupsLogic.actions, 'setNewGroup');
        const promise = Promise.resolve(groups[0]);
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.saveNewGroup();
        expect(HttpLogic.values.http.post).toHaveBeenCalledWith('/api/workplace_search/groups', {
          body: JSON.stringify({ group_name: GROUP_NAME }),
          headers,
        });
        await promise;
        expect(setNewGroupSpy).toHaveBeenCalledWith(groups[0]);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupsLogic.actions.saveNewGroup();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('setActivePage', () => {
      it('sets reducer', () => {
        const getSearchResultsSpy = jest.spyOn(GroupsLogic.actions, 'getSearchResults');
        const activePage = 3;
        GroupsLogic.actions.setActivePage(activePage);

        expect(GroupsLogic.values.groupsMeta).toEqual({
          ...DEFAULT_META,
          page: {
            ...DEFAULT_META.page,
            current: activePage,
          },
        });

        expect(getSearchResultsSpy).toHaveBeenCalled();
      });
    });

    describe('openNewGroupModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.openNewGroupModal();

        expect(GroupsLogic.values.newGroupModalOpen).toEqual(true);
        expect(GroupsLogic.values.newGroup).toEqual(null);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });

    describe('resetGroupsFilters', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.resetGroupsFilters();

        expect(GroupsLogic.values.filteredSources).toEqual([]);
        expect(GroupsLogic.values.filteredUsers).toEqual([]);
        expect(GroupsLogic.values.filterValue).toEqual('');
        expect(GroupsLogic.values.groupsMeta).toEqual(DEFAULT_META);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });

    describe('toggleFilterSourcesDropdown', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.toggleFilterSourcesDropdown();

        expect(GroupsLogic.values.filterSourcesDropdownOpen).toEqual(true);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });

    describe('toggleFilterUsersDropdown', () => {
      it('sets reducer and clears flash messages', () => {
        GroupsLogic.actions.toggleFilterUsersDropdown();

        expect(GroupsLogic.values.filterUsersDropdownOpen).toEqual(true);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });
  });
});
