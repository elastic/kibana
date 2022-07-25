/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';

import { coreMock } from '@kbn/core/public/mocks';
import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import type { RoleMapping } from '../../../../../common/model';
import { roleMappingsAPIClientMock } from '../../index.mock';
import { DeleteProvider } from './delete_provider';

describe('DeleteProvider', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows a single role mapping to be deleted', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.deleteRoleMappings.mockResolvedValue([{ name: 'delete-me', success: true }]);

    const notifications = coreMock.createStart().notifications;

    const props = {
      roleMappingsAPI,
      notifications,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {(onDelete) => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    wrapper.update();
    const { title, confirmButtonText } = wrapper.find(EuiConfirmModal).props();
    expect(title).toMatchInlineSnapshot(`"Delete role mapping 'delete-me'?"`);
    expect(confirmButtonText).toMatchInlineSnapshot(`"Delete role mapping"`);

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith(['delete-me']);

    expect(notifications.toasts.addError).toHaveBeenCalledTimes(0);
    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(0);
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.toasts.addSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "deletedRoleMappingSuccessToast",
          "title": "Deleted role mapping 'delete-me'",
        },
      ]
    `);
  });

  it('allows multiple role mappings to be deleted', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.deleteRoleMappings.mockResolvedValue([
      {
        name: 'delete-me',
        success: true,
      },
      {
        name: 'delete-me-too',
        success: true,
      },
    ]);

    const notifications = coreMock.createStart().notifications;

    const props = {
      roleMappingsAPI,
      notifications,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
      {
        name: 'delete-me-too',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {(onDelete) => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    wrapper.update();
    const { title, confirmButtonText } = wrapper.find(EuiConfirmModal).props();
    expect(title).toMatchInlineSnapshot(`"Delete 2 role mappings?"`);
    expect(confirmButtonText).toMatchInlineSnapshot(`"Delete role mappings"`);

    await act(async () => {
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith([
      'delete-me',
      'delete-me-too',
    ]);

    expect(notifications.toasts.addError).toHaveBeenCalledTimes(0);
    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(0);
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.toasts.addSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "deletedRoleMappingSuccessToast",
          "title": "Deleted 2 role mappings",
        },
      ]
    `);
  });

  it('handles mixed success/failure conditions', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.deleteRoleMappings.mockResolvedValue([
      {
        name: 'delete-me',
        success: true,
      },
      {
        name: 'i-wont-work',
        success: false,
        error: new Error('something went wrong. sad.'),
      },
    ]);

    const notifications = coreMock.createStart().notifications;

    const props = {
      roleMappingsAPI,
      notifications,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
      {
        name: 'i-wont-work',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {(onDelete) => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      wrapper.update();
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith([
      'delete-me',
      'i-wont-work',
    ]);

    expect(notifications.toasts.addError).toHaveBeenCalledTimes(0);
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(notifications.toasts.addSuccess.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data-test-subj": "deletedRoleMappingSuccessToast",
          "title": "Deleted role mapping 'delete-me'",
        },
      ]
    `);

    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(notifications.toasts.addDanger.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Error deleting role mapping 'i-wont-work'",
      ]
    `);
  });

  it('handles errors calling the API', async () => {
    const roleMappingsAPI = roleMappingsAPIClientMock.create();
    roleMappingsAPI.deleteRoleMappings.mockRejectedValue(new Error('AHHHHH'));

    const notifications = coreMock.createStart().notifications;
    const props = {
      roleMappingsAPI,
      notifications,
    };

    const roleMappingsToDelete = [
      {
        name: 'delete-me',
      },
    ] as RoleMapping[];

    const onSuccess = jest.fn();

    const wrapper = mountWithIntl(
      <DeleteProvider {...props}>
        {(onDelete) => (
          <button id="invoker" onClick={() => act(() => onDelete(roleMappingsToDelete, onSuccess))}>
            initiate delete
          </button>
        )}
      </DeleteProvider>
    );

    await act(async () => {
      wrapper.find('#invoker').simulate('click');
      await nextTick();
      wrapper.update();
    });

    await act(async () => {
      wrapper.update();
      findTestSubject(wrapper, 'confirmModalConfirmButton').simulate('click');
      await nextTick();
      wrapper.update();
    });

    expect(props.roleMappingsAPI.deleteRoleMappings).toHaveBeenCalledWith(['delete-me']);

    expect(notifications.toasts.addDanger).toHaveBeenCalledTimes(0);
    expect(notifications.toasts.addSuccess).toHaveBeenCalledTimes(0);

    expect(notifications.toasts.addError).toHaveBeenCalledTimes(1);
    expect(notifications.toasts.addError.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        [Error: AHHHHH],
        Object {
          "title": "Error deleting role mappings",
        },
      ]
    `);
  });
});
