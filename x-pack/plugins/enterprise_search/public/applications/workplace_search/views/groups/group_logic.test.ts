/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

jest.mock('../../../shared/http', () => ({
  HttpLogic: {
    values: { http: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } },
  },
}));
import { HttpLogic } from '../../../shared/http';

jest.mock('../../../shared/flash_messages', () => ({
  FlashMessagesLogic: { actions: { clearFlashMessages: jest.fn(), setQueuedMessages: jest.fn() } },
  flashAPIErrors: jest.fn(),
  setSuccessMessage: jest.fn(),
  setQueuedSuccessMessage: jest.fn(),
}));
import {
  FlashMessagesLogic,
  flashAPIErrors,
  setSuccessMessage,
  setQueuedSuccessMessage,
} from '../../../shared/flash_messages';

jest.mock('../../../shared/kibana', () => ({
  KibanaLogic: { values: { navigateToUrl: jest.fn() } },
}));
import { KibanaLogic } from '../../../shared/kibana';

import { groups } from '../../__mocks__/groups.mock';
import { mockGroupValues } from './__mocks__/group_logic.mock';
import { GroupLogic } from './group_logic';

import { GROUPS_PATH } from '../../routes';

describe('GroupLogic', () => {
  const group = groups[0];
  const sourceIds = ['123', '124'];
  const userIds = ['1z1z'];
  const sourcePriorities = { [sourceIds[0]]: 1, [sourceIds[1]]: 0.5 };
  const clearFlashMessagesSpy = jest.spyOn(FlashMessagesLogic.actions, 'clearFlashMessages');

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
    GroupLogic.mount();
  });

  it('has expected default values', () => {
    expect(GroupLogic.values).toEqual(mockGroupValues);
  });

  describe('actions', () => {
    describe('onInitializeGroup', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onInitializeGroup(group);

        expect(GroupLogic.values.group).toEqual(group);
        expect(GroupLogic.values.dataLoading).toEqual(false);
        expect(GroupLogic.values.groupNameInputValue).toEqual(group.name);
        expect(GroupLogic.values.selectedGroupSources).toEqual(sourceIds);
        expect(GroupLogic.values.selectedGroupUsers).toEqual(userIds);
        expect(GroupLogic.values.cachedSourcePriorities).toEqual(sourcePriorities);
        expect(GroupLogic.values.activeSourcePriorities).toEqual(sourcePriorities);
        expect(GroupLogic.values.groupPrioritiesUnchanged).toEqual(true);
      });
    });

    describe('onGroupNameChanged', () => {
      it('sets reducers', () => {
        const renamedGroup = {
          ...group,
          name: 'changed',
        };
        GroupLogic.actions.onGroupNameChanged(renamedGroup);

        expect(GroupLogic.values.group).toEqual(renamedGroup);
        expect(GroupLogic.values.groupNameInputValue).toEqual(renamedGroup.name);
      });
    });

    describe('onGroupPrioritiesChanged', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onGroupPrioritiesChanged(group);

        expect(GroupLogic.values.dataLoading).toEqual(false);
        expect(GroupLogic.values.cachedSourcePriorities).toEqual(sourcePriorities);
        expect(GroupLogic.values.activeSourcePriorities).toEqual(sourcePriorities);
      });
    });

    describe('onGroupNameInputChange', () => {
      it('sets reducers', () => {
        const name = 'new name';
        GroupLogic.actions.onGroupNameInputChange(name);

        expect(GroupLogic.values.groupNameInputValue).toEqual(name);
      });
    });

    describe('addGroupSource', () => {
      it('sets reducer', () => {
        GroupLogic.actions.addGroupSource(sourceIds[0]);

        expect(GroupLogic.values.selectedGroupSources).toEqual([sourceIds[0]]);
      });
    });

    describe('removeGroupSource', () => {
      it('sets reducers', () => {
        GroupLogic.actions.addGroupSource(sourceIds[0]);
        GroupLogic.actions.addGroupSource(sourceIds[1]);
        GroupLogic.actions.removeGroupSource(sourceIds[0]);

        expect(GroupLogic.values.selectedGroupSources).toEqual([sourceIds[1]]);
      });
    });

    describe('addGroupUser', () => {
      it('sets reducer', () => {
        GroupLogic.actions.addGroupUser(sourceIds[0]);

        expect(GroupLogic.values.selectedGroupUsers).toEqual([sourceIds[0]]);
      });
    });

    describe('removeGroupUser', () => {
      it('sets reducers', () => {
        GroupLogic.actions.addGroupUser(sourceIds[0]);
        GroupLogic.actions.addGroupUser(sourceIds[1]);
        GroupLogic.actions.removeGroupUser(sourceIds[0]);

        expect(GroupLogic.values.selectedGroupUsers).toEqual([sourceIds[1]]);
      });
    });

    describe('onGroupSourcesSaved', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onGroupSourcesSaved(group);

        expect(GroupLogic.values.group).toEqual(group);
        expect(GroupLogic.values.sharedSourcesModalVisible).toEqual(false);
        expect(GroupLogic.values.selectedGroupSources).toEqual(sourceIds);
        expect(GroupLogic.values.cachedSourcePriorities).toEqual(sourcePriorities);
        expect(GroupLogic.values.activeSourcePriorities).toEqual(sourcePriorities);
      });
    });

    describe('onGroupUsersSaved', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onGroupUsersSaved(group);

        expect(GroupLogic.values.group).toEqual(group);
        expect(GroupLogic.values.manageUsersModalVisible).toEqual(false);
        expect(GroupLogic.values.selectedGroupUsers).toEqual(userIds);
      });
    });

    describe('setGroupModalErrors', () => {
      it('sets reducers', () => {
        const errors = ['this is an error'];
        GroupLogic.actions.setGroupModalErrors(errors);

        expect(GroupLogic.values.managerModalFormErrors).toEqual(errors);
      });
    });

    describe('hideSharedSourcesModal', () => {
      it('sets reducers', () => {
        GroupLogic.actions.hideSharedSourcesModal(group);

        expect(GroupLogic.values.sharedSourcesModalVisible).toEqual(false);
        expect(GroupLogic.values.selectedGroupSources).toEqual(sourceIds);
      });
    });

    describe('hideManageUsersModal', () => {
      it('sets reducers', () => {
        GroupLogic.actions.hideManageUsersModal(group);

        expect(GroupLogic.values.manageUsersModalVisible).toEqual(false);
        expect(GroupLogic.values.managerModalFormErrors).toEqual([]);
        expect(GroupLogic.values.selectedGroupUsers).toEqual(userIds);
      });
    });

    describe('selectAllSources', () => {
      it('sets reducers', () => {
        GroupLogic.actions.selectAllSources(group.contentSources);

        expect(GroupLogic.values.selectedGroupSources).toEqual(sourceIds);
      });
    });

    describe('selectAllUsers', () => {
      it('sets reducers', () => {
        GroupLogic.actions.selectAllUsers(group.users);

        expect(GroupLogic.values.selectedGroupUsers).toEqual(userIds);
      });
    });

    describe('updatePriority', () => {
      it('sets reducers', () => {
        const PRIORITY_VALUE = 4;
        GroupLogic.actions.updatePriority(sourceIds[0], PRIORITY_VALUE);

        expect(GroupLogic.values.activeSourcePriorities).toEqual({
          [sourceIds[0]]: PRIORITY_VALUE,
        });
        expect(GroupLogic.values.groupPrioritiesUnchanged).toEqual(false);
      });
    });

    describe('resetGroup', () => {
      it('sets reducers', () => {
        GroupLogic.actions.resetGroup();

        expect(GroupLogic.values.group).toEqual({});
        expect(GroupLogic.values.dataLoading).toEqual(true);
      });
    });

    describe('hideConfirmDeleteModal', () => {
      it('sets reducer', () => {
        GroupLogic.actions.showConfirmDeleteModal();
        GroupLogic.actions.hideConfirmDeleteModal();

        expect(GroupLogic.values.confirmDeleteModalVisible).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('initializeGroup', () => {
      it('calls API and sets values', async () => {
        const onInitializeGroupSpy = jest.spyOn(GroupLogic.actions, 'onInitializeGroup');
        const promise = Promise.resolve(group);
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.initializeGroup(sourceIds[0]);
        expect(HttpLogic.values.http.get).toHaveBeenCalledWith('/api/workplace_search/groups/123');
        await promise;
        expect(onInitializeGroupSpy).toHaveBeenCalledWith(group);
      });

      it('handles 404 error', async () => {
        const promise = Promise.reject({ response: { status: 404 } });
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.initializeGroup(sourceIds[0]);

        try {
          await promise;
        } catch {
          expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(GROUPS_PATH);
          expect(FlashMessagesLogic.actions.setQueuedMessages).toHaveBeenCalledWith({
            type: 'error',
            message: 'Unable to find group with ID: "123".',
          });
        }
      });

      it('handles non-404 error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.initializeGroup(sourceIds[0]);

        try {
          await promise;
        } catch {
          expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(GROUPS_PATH);
          expect(FlashMessagesLogic.actions.setQueuedMessages).toHaveBeenCalledWith({
            type: 'error',
            message: 'this is an error',
          });
        }
      });
    });

    describe('deleteGroup', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
      });
      it('deletes a group', async () => {
        const promise = Promise.resolve(true);
        (HttpLogic.values.http.delete as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.deleteGroup();
        expect(HttpLogic.values.http.delete).toHaveBeenCalledWith(
          '/api/workplace_search/groups/123'
        );

        await promise;
        expect(KibanaLogic.values.navigateToUrl).toHaveBeenCalledWith(GROUPS_PATH);
        expect(setQueuedSuccessMessage).toHaveBeenCalledWith(
          'Group "group" was successfully deleted.'
        );
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.delete as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.deleteGroup();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('updateGroupName', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
        GroupLogic.actions.onGroupNameInputChange('new name');
      });
      it('updates name', async () => {
        const onGroupNameChangedSpy = jest.spyOn(GroupLogic.actions, 'onGroupNameChanged');
        const promise = Promise.resolve(group);
        (HttpLogic.values.http.put as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.updateGroupName();
        expect(HttpLogic.values.http.put).toHaveBeenCalledWith('/api/workplace_search/groups/123', {
          body: JSON.stringify({ group: { name: 'new name' } }),
        });

        await promise;
        expect(onGroupNameChangedSpy).toHaveBeenCalledWith(group);
        expect(setSuccessMessage).toHaveBeenCalledWith(
          'Successfully renamed this group to "group".'
        );
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.put as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.updateGroupName();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('saveGroupSources', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
        GroupLogic.actions.selectAllSources(group.contentSources);
      });
      it('updates name', async () => {
        const onGroupSourcesSavedSpy = jest.spyOn(GroupLogic.actions, 'onGroupSourcesSaved');
        const promise = Promise.resolve(group);
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.saveGroupSources();
        expect(HttpLogic.values.http.post).toHaveBeenCalledWith(
          '/api/workplace_search/groups/123/share',
          {
            body: JSON.stringify({ content_source_ids: sourceIds }),
          }
        );

        await promise;
        expect(onGroupSourcesSavedSpy).toHaveBeenCalledWith(group);
        expect(setSuccessMessage).toHaveBeenCalledWith(
          'Successfully updated shared content sources.'
        );
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.saveGroupSources();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('saveGroupUsers', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
      });
      it('updates name', async () => {
        const onGroupUsersSavedSpy = jest.spyOn(GroupLogic.actions, 'onGroupUsersSaved');
        const promise = Promise.resolve(group);
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.saveGroupUsers();
        expect(HttpLogic.values.http.post).toHaveBeenCalledWith(
          '/api/workplace_search/groups/123/assign',
          {
            body: JSON.stringify({ user_ids: userIds }),
          }
        );

        await promise;
        expect(onGroupUsersSavedSpy).toHaveBeenCalledWith(group);
        expect(setSuccessMessage).toHaveBeenCalledWith(
          'Successfully updated the users of this group.'
        );
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.post as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.saveGroupUsers();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('saveGroupSourcePrioritization', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
      });
      it('updates name', async () => {
        const onGroupPrioritiesChangedSpy = jest.spyOn(
          GroupLogic.actions,
          'onGroupPrioritiesChanged'
        );
        const promise = Promise.resolve(group);
        (HttpLogic.values.http.put as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.saveGroupSourcePrioritization();
        expect(HttpLogic.values.http.put).toHaveBeenCalledWith(
          '/api/workplace_search/groups/123/boosts',
          {
            body: JSON.stringify({
              content_source_boosts: [
                [sourceIds[0], 1],
                [sourceIds[1], 0.5],
              ],
            }),
          }
        );

        await promise;
        expect(setSuccessMessage).toHaveBeenCalledWith(
          'Successfully updated shared source prioritization.'
        );
        expect(onGroupPrioritiesChangedSpy).toHaveBeenCalledWith(group);
      });

      it('handles error', async () => {
        const promise = Promise.reject('this is an error');
        (HttpLogic.values.http.put as jest.Mock).mockReturnValue(promise);

        GroupLogic.actions.saveGroupSourcePrioritization();
        try {
          await promise;
        } catch {
          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        }
      });
    });

    describe('showConfirmDeleteModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupLogic.actions.showConfirmDeleteModal();

        expect(GroupLogic.values.confirmDeleteModalVisible).toEqual(true);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });

    describe('showSharedSourcesModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupLogic.actions.showSharedSourcesModal();

        expect(GroupLogic.values.sharedSourcesModalVisible).toEqual(true);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });

    describe('showManageUsersModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupLogic.actions.showManageUsersModal();

        expect(GroupLogic.values.manageUsersModalVisible).toEqual(true);
        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });

    describe('resetFlashMessages', () => {
      it('clears flash messages', () => {
        GroupLogic.actions.resetFlashMessages();

        expect(clearFlashMessagesSpy).toHaveBeenCalled();
      });
    });
  });
});
