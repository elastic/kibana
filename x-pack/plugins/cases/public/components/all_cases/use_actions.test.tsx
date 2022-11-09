/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/dom';
import { act, renderHook } from '@testing-library/react-hooks';

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

    act(() => {
      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    });

    await waitFor(() => {
      expect(res.getByText('Actions')).toBeInTheDocument();
      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
    });
  });

  it('change the status of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ disableActions: false }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions!.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    act(() => {
      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    });

    await waitFor(() => {
      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(res.getByTestId(`case-action-status-panel-${basicCase.id}`));
    });

    await waitFor(() => {
      expect(res.getByTestId('cases-bulk-action-status-open')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(res.getByTestId('cases-bulk-action-status-in-progress'));
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

    act(() => {
      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    });

    await waitFor(() => {
      expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(res.getByTestId(`case-action-severity-panel-${basicCase.id}`), undefined, {
        skipPointerEventsCheck: true,
      });
    });

    await waitFor(() => {
      expect(res.getByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();
    });

    act(() => {
      userEvent.click(res.getByTestId('cases-bulk-action-severity-medium'));
    });

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
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

      act(() => {
        userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      });

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(res.getByTestId('cases-bulk-action-delete'), undefined, {
          skipPointerEventsCheck: true,
        });
      });

      await waitFor(() => {
        expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(res.getByTestId('confirmModalConfirmButton'));
      });

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

      act(() => {
        userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      });

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(res.getByTestId('cases-bulk-action-delete'), undefined, {
          skipPointerEventsCheck: true,
        });
      });

      await waitFor(() => {
        expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
      });

      act(() => {
        userEvent.click(res.getByTestId('confirmModalCancelButton'), undefined, {
          skipPointerEventsCheck: true,
        });
      });

      expect(res.queryByTestId('confirm-delete-case-modal')).toBeFalsy();
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

      act(() => {
        userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      });

      await waitFor(() => {
        expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
        expect(res.getByTestId(`actions-separator-${basicCase.id}`)).toBeInTheDocument();
      });
    });

    it('shows the correct actions with no delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: noDeleteCasesPermissions() });
      const { result } = renderHook(() => useActions({ disableActions: false }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions!.render(basicCase) as React.ReactElement;
      const res = appMockRender.render(comp);

      act(() => {
        userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      });

      await waitFor(() => {
        expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
        expect(res.getByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeInTheDocument();
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

      act(() => {
        userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
      });

      await waitFor(() => {
        expect(res.queryByTestId(`case-action-status-panel-${basicCase.id}`)).toBeFalsy();
        expect(res.queryByTestId(`case-action-severity-panel-${basicCase.id}`)).toBeFalsy();
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
