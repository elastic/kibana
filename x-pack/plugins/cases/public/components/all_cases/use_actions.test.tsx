/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks/dom';
import {
  waitForEuiPopoverOpen,
  waitForEuiContextMenuPanelTransition,
} from '@elastic/eui/lib/test/rtl';

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
          "width": "100px",
        },
      }
    `);
  });

  it('renders the popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    appMockRender.render(comp);

    expect(await screen.findByTestId(`case-action-popover-${basicCase.id}`)).toBeInTheDocument();
  });

  it('open the action popover', async () => {
    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    appMockRender.render(comp);

    userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    expect(await screen.findByText('Actions')).toBeInTheDocument();
    expect(
      await screen.findByTestId(`case-action-status-panel-${basicCase.id}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId('cases-bulk-action-delete')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-action-copy-id')).toBeInTheDocument();
  });

  it('change the status of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    appMockRender.render(comp);

    userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByTestId(`case-action-status-panel-${basicCase.id}`));
    await waitForEuiContextMenuPanelTransition();

    expect(await screen.findByTestId('cases-bulk-action-status-open')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('cases-bulk-action-status-in-progress'));

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
    appMockRender.render(comp);

    userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByTestId(`case-action-severity-panel-${basicCase.id}`));
    await waitForEuiContextMenuPanelTransition();

    expect(await screen.findByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();

    userEvent.click(await screen.findByTestId('cases-bulk-action-severity-medium'));

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
    appMockRender.render(comp);

    userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
    await waitForEuiPopoverOpen();

    userEvent.click(await screen.findByTestId('cases-action-copy-id'));

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
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      userEvent.click(await screen.findByTestId('cases-bulk-action-delete'));

      expect(await screen.findByTestId('confirm-delete-case-modal')).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled();
      });
    });

    it('closes the modal', async () => {
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      userEvent.click(await screen.findByTestId('cases-bulk-action-delete'));

      expect(await screen.findByTestId('confirm-delete-case-modal')).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('confirmModalCancelButton'));

      expect(screen.queryByTestId('confirm-delete-case-modal')).toBeFalsy();
    });
  });

  describe('Flyouts', () => {
    it('change the tags of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      userEvent.click(await screen.findByTestId('cases-bulk-action-tags'));

      expect(await screen.findByTestId('cases-edit-tags-flyout')).toBeInTheDocument();

      expect(await screen.findByText('coke')).toBeInTheDocument();

      userEvent.click(await screen.findByText('coke'));
      userEvent.click(await screen.findByTestId('cases-edit-tags-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('cases-edit-tags-flyout')).toBeFalsy();
      });
    });

    it('change the assignees of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      userEvent.click(await screen.findByTestId('cases-bulk-action-assignees'));

      expect(await screen.findByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();

      expect(await screen.findByText('Damaged Raccoon')).toBeInTheDocument();

      userEvent.click(await screen.findByText('Damaged Raccoon'));
      userEvent.click(await screen.findByTestId('cases-edit-assignees-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('cases-edit-assignees-flyout')).toBeFalsy();
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
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(
        await screen.findByTestId(`case-action-status-panel-${basicCase.id}`)
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId(`case-action-severity-panel-${basicCase.id}`)
      ).toBeInTheDocument();
      expect(await screen.findByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(await screen.findByTestId(`actions-separator-${basicCase.id}`)).toBeInTheDocument();
      expect(await screen.findByTestId('cases-action-copy-id')).toBeInTheDocument();
    });

    it('shows the correct actions with no delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: noDeleteCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(
        await screen.findByTestId(`case-action-status-panel-${basicCase.id}`)
      ).toBeInTheDocument();
      expect(
        await screen.findByTestId(`case-action-severity-panel-${basicCase.id}`)
      ).toBeInTheDocument();
      expect(await screen.findByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-bulk-action-delete')).toBeFalsy();
      expect(screen.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
    });

    it('shows the correct actions with only delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      appMockRender.render(comp);

      userEvent.click(await screen.findByTestId(`case-action-popover-button-${basicCase.id}`));
      await waitForEuiPopoverOpen();

      expect(screen.queryByTestId(`case-action-status-panel-${basicCase.id}`)).toBeFalsy();
      expect(screen.queryByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeFalsy();
      expect(await screen.findByTestId('cases-action-copy-id')).toBeInTheDocument();
      expect(await screen.findByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      expect(screen.queryByTestId(`actions-separator-${basicCase.id}`)).toBeFalsy();
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
      appMockRender.render(comp);

      expect(
        await screen.findByTestId(`case-action-popover-button-${basicCase.id}`)
      ).toBeDisabled();
    });
  });
});
