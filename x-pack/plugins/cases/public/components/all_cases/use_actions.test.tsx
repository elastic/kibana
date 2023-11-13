/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks/dom';

import { useActions } from './use_actions';
import { basicCase } from '../../containers/mock';
import * as api from '../../containers/api';
import type { AppMockRenderer } from '../../common/mock';
import {
  createAppMockRenderer,
  noDeleteCasesPermissions,
  onlyDeleteCasesPermission,
  allCasesPermissions,
  readCasesPermissions,
} from '../../common/mock';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');

describe('useActions', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders column actions', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "actions": Object {
          "align": "right",
          "name": "Actions",
          "render": [Function],
        },
      }
    `);
  });

  it('renders the popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    expect(res.getByTestId(`case-action-popover-${basicCase.id}`)).toBeInTheDocument();
  });

  it('open the action popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

    await waitFor(() => {
      expect(res.getByText('Actions')).toBeInTheDocument();
      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
    });
  });

  it('change the status of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

    await waitFor(() => {
      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
    });

    userEvent.click(res.getByTestId(`case-action-status-panel-${basicCase.id}`), undefined, {
      skipPointerEventsCheck: true,
    });

    await waitFor(() => {
      expect(res.getByTestId('cases-bulk-action-status-open')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();
    });

    userEvent.click(res.getByTestId('cases-bulk-action-status-in-progress'), undefined, {
      skipPointerEventsCheck: true,
    });

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
    });
  });

  it('change the severity of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

    await waitFor(() => {
      expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
    });

    userEvent.click(res.getByTestId(`case-action-severity-panel-${basicCase.id}`), undefined, {
      skipPointerEventsCheck: true,
    });

    await waitFor(() => {
      expect(res.getByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();
    });

    userEvent.click(res.getByTestId('cases-bulk-action-severity-medium'), undefined, {
      skipPointerEventsCheck: true,
    });

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
    });
  });

  it('copies the case id to the clipboard', async () => {
    const originalClipboard = global.window.navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
      writable: true,
    });

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

    await waitFor(() => {
      expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
    });

    userEvent.click(res.getByTestId('cases-action-copy-id'), undefined, {
      skipPointerEventsCheck: true,
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  describe('Modals', () => {
    it('delete a case', async () => {
      const deleteSpy = jest.spyOn(api, 'deleteCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      });

      userEvent.click(res.getByTestId('cases-bulk-action-delete'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      userEvent.click(res.getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled();
      });
    });

    it('closes the modal', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      });

      userEvent.click(res.getByTestId('cases-bulk-action-delete'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      userEvent.click(res.getByTestId('confirmModalCancelButton'), undefined, {
        skipPointerEventsCheck: true,
      });

      expect(res.queryByTestId('confirm-delete-case-modal')).toBeFalsy();
    });
  });

  describe('Flyouts', () => {
    it('change the tags of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-tags')).toBeInTheDocument();
      });

      userEvent.click(res.getByTestId('cases-bulk-action-tags'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(res.getByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(res.getByText('coke')).toBeInTheDocument();
      });

      userEvent.click(res.getByText('coke'));
      userEvent.click(res.getByTestId('cases-edit-tags-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(res.queryByTestId('cases-edit-tags-flyout')).toBeFalsy();
      });
    });

    it('change the assignees of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-assignees')).toBeInTheDocument();
      });

      userEvent.click(res.getByTestId('cases-bulk-action-assignees'), undefined, {
        skipPointerEventsCheck: true,
      });

      await waitFor(() => {
        expect(res.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(res.getByText('Damaged Raccoon')).toBeInTheDocument();
      });

      userEvent.click(res.getByText('Damaged Raccoon'));
      userEvent.click(res.getByTestId('cases-edit-assignees-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(res.queryByTestId('cases-edit-assignees-flyout')).toBeFalsy();
      });
    });
  });

  describe('Permissions', () => {
    it('shows the correct actions with all permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: allCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
        expect(res.getByTestId(`actions-separator-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
      });
    });

    it('shows the correct actions with no delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: noDeleteCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
        expect(res.queryByTestId('cases-bulk-action-delete')).toBeFalsy();
        expect(res.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
      });
    });

    it('shows the correct actions with only delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));

      await waitFor(() => {
        expect(res.queryByTestId(`case-action-status-panel-${basicCase.id}`)).toBeFalsy();
        expect(res.queryByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeFalsy();
        expect(res.getByTestId('cases-action-copy-id')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
        expect(res.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
      });
    });

    it('returns null if the user does not have update or delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: readCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.actions).toBe(null);
    });

    it('disables the action correctly', async () => {
      appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
      const { result } = renderHook(() => useActions({ disableActions: true }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      await waitFor(() => {
        expect(res.getByTestId(`case-action-popover-button-${basicCase.id}`)).toBeDisabled();
      });
    });
  });
});
