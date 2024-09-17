/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiContextMenu } from '@elastic/eui';
import userEvent from '@testing-library/user-event';
import { waitFor, renderHook } from '@testing-library/react';

import type { AppMockRenderer } from '../../common/mock';
import {
  allCasesPermissions,
  createAppMockRenderer,
  noDeleteCasesPermissions,
  onlyDeleteCasesPermission,
} from '../../common/mock';
import { useBulkActions } from './use_bulk_actions';
import * as api from '../../containers/api';
import { basicCase } from '../../containers/mock';

jest.mock('../../containers/api');
jest.mock('../../containers/user_profiles/api');

describe('useBulkActions', () => {
  let appMockRender: AppMockRenderer;
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  describe('Panels', () => {
    it('renders bulk actions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current).toMatchInlineSnapshot(`
        Object {
          "flyouts": <React.Fragment />,
          "modals": <React.Fragment />,
          "panels": Array [
            Object {
              "id": 0,
              "items": Array [
                Object {
                  "data-test-subj": "case-bulk-action-status",
                  "disabled": false,
                  "key": "case-bulk-action-status",
                  "name": "Status",
                  "panel": 1,
                },
                Object {
                  "data-test-subj": "case-bulk-action-severity",
                  "disabled": false,
                  "key": "case-bulk-action-severity",
                  "name": "Severity",
                  "panel": 2,
                },
                Object {
                  "data-test-subj": "bulk-actions-separator",
                  "isSeparator": true,
                  "key": "bulk-actions-separator",
                },
                Object {
                  "data-test-subj": "cases-bulk-action-tags",
                  "disabled": false,
                  "icon": <EuiIcon
                    size="m"
                    type="tag"
                  />,
                  "key": "cases-bulk-action-tags",
                  "name": "Edit tags",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-assignees",
                  "disabled": false,
                  "icon": <EuiIcon
                    size="m"
                    type="userAvatar"
                  />,
                  "key": "cases-bulk-action-assignees",
                  "name": "Edit assignees",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-delete",
                  "disabled": false,
                  "icon": <EuiIcon
                    color="danger"
                    size="m"
                    type="trash"
                  />,
                  "key": "cases-bulk-action-delete",
                  "name": <EuiTextColor
                    color="danger"
                  >
                    Delete case
                  </EuiTextColor>,
                  "onClick": [Function],
                },
              ],
              "title": "Actions",
            },
            Object {
              "id": 1,
              "items": Array [
                Object {
                  "data-test-subj": "cases-bulk-action-status-open",
                  "disabled": true,
                  "icon": "empty",
                  "key": "cases-bulk-action-status-open",
                  "name": "Open",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-status-in-progress",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-status-in-progress",
                  "name": "In progress",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-status-closed",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-status-action",
                  "name": "Closed",
                  "onClick": [Function],
                },
              ],
              "title": "Status",
            },
            Object {
              "id": 2,
              "items": Array [
                Object {
                  "data-test-subj": "cases-bulk-action-severity-low",
                  "disabled": true,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-low",
                  "name": "Low",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-severity-medium",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-medium",
                  "name": "Medium",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-severity-high",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-high",
                  "name": "High",
                  "onClick": [Function],
                },
                Object {
                  "data-test-subj": "cases-bulk-action-severity-critical",
                  "disabled": false,
                  "icon": "empty",
                  "key": "cases-bulk-action-severity-critical",
                  "name": "Critical",
                  "onClick": [Function],
                },
              ],
              "title": "Severity",
            },
          ],
        }
      `);
    });

    it('change the status of cases', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await userEvent.click(res.getByTestId('case-bulk-action-status'));

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-status-open')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-status-in-progress')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-status-closed')).toBeInTheDocument();
      });

      await userEvent.click(res.getByTestId('cases-bulk-action-status-in-progress'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });

    it('change the severity of cases', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await userEvent.click(res.getByTestId('case-bulk-action-severity'));

      await waitFor(() => {
        expect(res.getByTestId('cases-bulk-action-severity-low')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-severity-medium')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-severity-high')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-severity-critical')).toBeInTheDocument();
      });

      await userEvent.click(res.getByTestId('cases-bulk-action-severity-medium'), {
        pointerEventsCheck: 0,
      });

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });

    describe('Modals', () => {
      it('delete a case', async () => {
        const deleteSpy = jest.spyOn(api, 'deleteCases');

        const { result } = renderHook(
          () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
          {
            wrapper: appMockRender.AppWrapper,
          }
        );

        let modals = result.current.modals;
        const panels = result.current.panels;

        const res = appMockRender.render(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await userEvent.click(res.getByTestId('cases-bulk-action-delete'));

        modals = result.current.modals;
        res.rerender(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await waitFor(() => {
          expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
        });

        await userEvent.click(res.getByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(deleteSpy).toHaveBeenCalled();
        });
      });

      it('closes the modal', async () => {
        const { result } = renderHook(
          () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
          {
            wrapper: appMockRender.AppWrapper,
          }
        );

        let modals = result.current.modals;
        const panels = result.current.panels;

        const res = appMockRender.render(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await userEvent.click(res.getByTestId('cases-bulk-action-delete'));

        modals = result.current.modals;
        res.rerender(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        await waitFor(() => {
          expect(res.getByTestId('confirm-delete-case-modal')).toBeInTheDocument();
        });

        await userEvent.click(res.getByTestId('confirmModalCancelButton'));

        modals = result.current.modals;
        res.rerender(
          <>
            <EuiContextMenu initialPanelId={0} panels={panels} />
            {modals}
          </>
        );

        expect(res.queryByTestId('confirm-delete-case-modal')).toBeFalsy();
      });
    });
  });

  describe('Flyouts', () => {
    it('change the tags of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      let flyouts = result.current.flyouts;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await userEvent.click(res.getByTestId('cases-bulk-action-tags'));

      flyouts = result.current.flyouts;

      res.rerender(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await waitFor(() => {
        expect(res.getByTestId('cases-edit-tags-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(res.getByText('coke')).toBeInTheDocument();
      });

      await userEvent.click(res.getByText('coke'));
      await userEvent.click(res.getByTestId('cases-edit-tags-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });

    it('change the assignees of the case', async () => {
      const updateCasesSpy = jest.spyOn(api, 'updateCases');

      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      let flyouts = result.current.flyouts;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await userEvent.click(res.getByTestId('cases-bulk-action-assignees'));

      flyouts = result.current.flyouts;

      res.rerender(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {flyouts}
        </>
      );

      await waitFor(() => {
        expect(res.getByTestId('cases-edit-assignees-flyout')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(res.getByText('Damaged Raccoon')).toBeInTheDocument();
      });

      await userEvent.click(res.getByText('Damaged Raccoon'));
      await userEvent.click(res.getByTestId('cases-edit-assignees-flyout-submit'));

      await waitFor(() => {
        expect(updateCasesSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Permissions', () => {
    it('shows the correct actions with all permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: allCasesPermissions() });
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await waitFor(() => {
        expect(res.getByTestId('case-bulk-action-status')).toBeInTheDocument();
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
        expect(res.getByTestId('bulk-actions-separator')).toBeInTheDocument();
      });
    });

    it('shows the correct actions with no delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: noDeleteCasesPermissions() });
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await waitFor(() => {
        expect(res.getByTestId('case-bulk-action-status')).toBeInTheDocument();
        expect(res.queryByTestId('cases-bulk-action-delete')).toBeFalsy();
        expect(res.queryByTestId('bulk-actions-separator')).toBeFalsy();
      });
    });

    it('shows the correct actions with only delete permissions', async () => {
      appMockRender = createAppMockRenderer({ permissions: onlyDeleteCasesPermission() });
      const { result } = renderHook(
        () => useBulkActions({ onAction, onActionSuccess, selectedCases: [basicCase] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const modals = result.current.modals;
      const panels = result.current.panels;

      const res = appMockRender.render(
        <>
          <EuiContextMenu initialPanelId={0} panels={panels} />
          {modals}
        </>
      );

      await waitFor(() => {
        expect(res.queryByTestId('case-bulk-action-status')).toBeFalsy();
        expect(res.getByTestId('cases-bulk-action-delete')).toBeInTheDocument();
        expect(res.queryByTestId('bulk-actions-separator')).toBeFalsy();
      });
    });
  });
});
