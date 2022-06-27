/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockKibanaValues,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';
import { groups } from '../../__mocks__/groups.mock';
import { mockGroupValues } from './__mocks__/group_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';
import { GROUPS_PATH } from '../../routes';

import { GroupLogic } from './group_logic';

describe('GroupLogic', () => {
  const { mount } = new LogicMounter(GroupLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashSuccessToast, setQueuedErrorMessage } = mockFlashMessageHelpers;

  const group = groups[0];
  const sourceIds = ['123', '124'];
  const sourcePriorities = { [sourceIds[0]]: 1, [sourceIds[1]]: 0.5 };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(GroupLogic.values).toEqual(mockGroupValues);
  });

  describe('actions', () => {
    describe('onInitializeGroup', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onInitializeGroup(group);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          group,
          dataLoading: false,
          groupNameInputValue: group.name,
          selectedGroupSources: sourceIds,
          cachedSourcePriorities: sourcePriorities,
          activeSourcePriorities: sourcePriorities,
          groupPrioritiesUnchanged: true,
        });
      });
    });

    describe('onGroupNameChanged', () => {
      it('sets reducers', () => {
        const renamedGroup = {
          ...group,
          name: 'changed',
        };
        GroupLogic.actions.onGroupNameChanged(renamedGroup);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          group: renamedGroup,
          groupNameInputValue: renamedGroup.name,
        });
      });
    });

    describe('onGroupPrioritiesChanged', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onGroupPrioritiesChanged(group);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          cachedSourcePriorities: sourcePriorities,
          activeSourcePriorities: sourcePriorities,
          dataLoading: false,
        });
      });
    });

    describe('onGroupNameInputChange', () => {
      it('sets reducers', () => {
        const name = 'new name';
        GroupLogic.actions.onGroupNameInputChange(name);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          groupNameInputValue: name,
        });
      });
    });

    describe('addGroupSource', () => {
      it('sets reducer', () => {
        GroupLogic.actions.addGroupSource(sourceIds[0]);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          selectedGroupSources: [sourceIds[0]],
        });
      });
    });

    describe('removeGroupSource', () => {
      it('sets reducers', () => {
        GroupLogic.actions.addGroupSource(sourceIds[0]);
        GroupLogic.actions.addGroupSource(sourceIds[1]);
        GroupLogic.actions.removeGroupSource(sourceIds[0]);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          selectedGroupSources: [sourceIds[1]],
        });
      });
    });

    describe('onGroupSourcesSaved', () => {
      it('sets reducers', () => {
        GroupLogic.actions.onGroupSourcesSaved(group);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          group,
          orgSourcesModalVisible: false,
          cachedSourcePriorities: sourcePriorities,
          activeSourcePriorities: sourcePriorities,
          selectedGroupSources: sourceIds,
        });
      });
    });

    describe('setGroupModalErrors', () => {
      it('sets reducers', () => {
        const errors = ['this is an error'];
        GroupLogic.actions.setGroupModalErrors(errors);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          managerModalFormErrors: errors,
        });
      });
    });

    describe('hideOrgSourcesModal', () => {
      it('sets reducers', () => {
        GroupLogic.actions.hideOrgSourcesModal(group);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          orgSourcesModalVisible: false,
          selectedGroupSources: sourceIds,
        });
      });
    });

    describe('selectAllSources', () => {
      it('sets reducers', () => {
        GroupLogic.actions.selectAllSources(group.contentSources);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          selectedGroupSources: sourceIds,
        });
      });
    });

    describe('updatePriority', () => {
      it('sets reducers', () => {
        const PRIORITY_VALUE = 4;
        GroupLogic.actions.updatePriority(sourceIds[0], PRIORITY_VALUE);

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          activeSourcePriorities: { [sourceIds[0]]: PRIORITY_VALUE },
          groupPrioritiesUnchanged: false,
        });
      });
    });

    describe('resetGroup', () => {
      it('sets reducers', () => {
        GroupLogic.actions.resetGroup();

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          group: {},
          dataLoading: true,
        });
      });
    });

    describe('hideConfirmDeleteModal', () => {
      it('sets reducer', () => {
        GroupLogic.actions.showConfirmDeleteModal();
        GroupLogic.actions.hideConfirmDeleteModal();

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          confirmDeleteModalVisible: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('initializeGroup', () => {
      it('calls API and sets values', async () => {
        const onInitializeGroupSpy = jest.spyOn(GroupLogic.actions, 'onInitializeGroup');
        http.get.mockReturnValue(Promise.resolve(group));

        GroupLogic.actions.initializeGroup(sourceIds[0]);
        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/groups/123');
        await nextTick();
        expect(onInitializeGroupSpy).toHaveBeenCalledWith(group);
      });

      it('handles 404 error', async () => {
        http.get.mockReturnValue(Promise.reject({ response: { status: 404 } }));

        GroupLogic.actions.initializeGroup(sourceIds[0]);
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalledWith(GROUPS_PATH);
        expect(setQueuedErrorMessage).toHaveBeenCalledWith('Unable to find group with ID: "123".');
      });

      it('handles non-404 error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));

        GroupLogic.actions.initializeGroup(sourceIds[0]);
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalledWith(GROUPS_PATH);
        expect(setQueuedErrorMessage).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('deleteGroup', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
        GroupLogic.actions.showConfirmDeleteModal();
      });
      it('deletes a group', async () => {
        http.delete.mockReturnValue(Promise.resolve(true));

        GroupLogic.actions.deleteGroup();

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          group,
          dataLoading: false,
          groupNameInputValue: group.name,
          selectedGroupSources: sourceIds,
          cachedSourcePriorities: sourcePriorities,
          activeSourcePriorities: sourcePriorities,
          groupPrioritiesUnchanged: true,
          confirmDeleteModalVisible: false,
        });
        expect(http.delete).toHaveBeenCalledWith('/internal/workplace_search/groups/123');

        await nextTick();
        expect(navigateToUrl).toHaveBeenCalledWith(GROUPS_PATH);
        expect(flashSuccessToast).toHaveBeenCalledWith('Group "group" was successfully deleted.');
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        GroupLogic.actions.deleteGroup();
      });
    });

    describe('updateGroupName', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
        GroupLogic.actions.onGroupNameInputChange('new name');
      });
      it('updates name', async () => {
        const onGroupNameChangedSpy = jest.spyOn(GroupLogic.actions, 'onGroupNameChanged');
        http.put.mockReturnValue(Promise.resolve(group));

        GroupLogic.actions.updateGroupName();
        expect(http.put).toHaveBeenCalledWith('/internal/workplace_search/groups/123', {
          body: JSON.stringify({ group: { name: 'new name' } }),
        });

        await nextTick();
        expect(onGroupNameChangedSpy).toHaveBeenCalledWith(group);
        expect(flashSuccessToast).toHaveBeenCalledWith(
          'Successfully renamed this group to "group".'
        );
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        GroupLogic.actions.updateGroupName();
      });
    });

    describe('saveGroupSources', () => {
      beforeEach(() => {
        GroupLogic.actions.onInitializeGroup(group);
        GroupLogic.actions.selectAllSources(group.contentSources);
      });
      it('updates name', async () => {
        const onGroupSourcesSavedSpy = jest.spyOn(GroupLogic.actions, 'onGroupSourcesSaved');
        http.post.mockReturnValue(Promise.resolve(group));

        GroupLogic.actions.saveGroupSources();
        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/groups/123/share', {
          body: JSON.stringify({ content_source_ids: sourceIds }),
        });

        await nextTick();
        expect(onGroupSourcesSavedSpy).toHaveBeenCalledWith(group);
        expect(flashSuccessToast).toHaveBeenCalledWith(
          'Successfully updated organizational content sources.'
        );
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        GroupLogic.actions.saveGroupSources();
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
        http.put.mockReturnValue(Promise.resolve(group));

        GroupLogic.actions.saveGroupSourcePrioritization();
        expect(http.put).toHaveBeenCalledWith('/internal/workplace_search/groups/123/boosts', {
          body: JSON.stringify({
            content_source_boosts: [
              [sourceIds[0], 1],
              [sourceIds[1], 0.5],
            ],
          }),
        });

        await nextTick();
        expect(flashSuccessToast).toHaveBeenCalledWith(
          'Successfully updated organizational source prioritization.'
        );
        expect(onGroupPrioritiesChangedSpy).toHaveBeenCalledWith(group);
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        GroupLogic.actions.saveGroupSourcePrioritization();
      });
    });

    describe('showConfirmDeleteModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupLogic.actions.showConfirmDeleteModal();

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          confirmDeleteModalVisible: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('showOrgSourcesModal', () => {
      it('sets reducer and clears flash messages', () => {
        GroupLogic.actions.showOrgSourcesModal();

        expect(GroupLogic.values).toEqual({
          ...mockGroupValues,
          orgSourcesModalVisible: true,
        });
        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });

    describe('resetFlashMessages', () => {
      it('clears flash messages', () => {
        GroupLogic.actions.resetFlashMessages();

        expect(clearFlashMessages).toHaveBeenCalled();
      });
    });
  });
});
