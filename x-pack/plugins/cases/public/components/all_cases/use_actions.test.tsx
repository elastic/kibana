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
import { allCasesPermissions, AppMockRenderer, createAppMockRenderer } from '../../common/mock';

jest.mock('../../containers/api');

describe('useActions', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders column actions', async () => {
    const { result } = renderHook(() => useActions({ permissions: allCasesPermissions() }), {
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
    const { result } = renderHook(() => useActions({ permissions: allCasesPermissions() }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    expect(res.getByTestId(`case-action-popover-${basicCase.id}`)).toBeInTheDocument();
  });

  it('open the action popover', async () => {
    const { result } = renderHook(() => useActions({ permissions: allCasesPermissions() }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions.render(basicCase) as React.ReactElement;
    const res = appMockRender.render(comp);

    act(() => {
      userEvent.click(res.getByTestId(`case-action-popover-button-${basicCase.id}`));
    });

    await waitFor(() => {
      expect(res.getByTestId(`case-action-status-panel-${basicCase.id}`)).toBeInTheDocument();
      expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
    });
  });

  it('change the status of the case', async () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');

    const { result } = renderHook(() => useActions({ permissions: allCasesPermissions() }), {
      wrapper: appMockRender.AppWrapper,
    });

    const comp = result.current.actions.render(basicCase) as React.ReactElement;
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
      userEvent.click(res.getByTestId('cases-bulk-action-status-open'));
    });

    await waitFor(() => {
      expect(updateCasesSpy).toHaveBeenCalled();
    });
  });

  describe('Modals', () => {
    it('delete a case', async () => {
      const deleteSpy = jest.spyOn(api, 'deleteCases');

      const { result } = renderHook(() => useActions({ permissions: allCasesPermissions() }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions.render(basicCase) as React.ReactElement;
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
      const { result } = renderHook(() => useActions({ permissions: allCasesPermissions() }), {
        wrapper: appMockRender.AppWrapper,
      });

      const comp = result.current.actions.render(basicCase) as React.ReactElement;
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
});
