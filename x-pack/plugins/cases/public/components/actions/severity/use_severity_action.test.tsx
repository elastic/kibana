/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { useSeverityAction } from './use_severity_action';

import * as api from '../../../containers/api';
import { basicCase } from '../../../containers/mock';
import { CaseSeverity } from '../../../../common/types/domain';

jest.mock('../../../containers/api');

describe('useSeverityAction', () => {
  let appMockRender: AppMockRenderer;
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders an action', async () => {
    const { result } = renderHook(
      () =>
        useSeverityAction({
          onAction,
          onActionSuccess,
          isDisabled: false,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current.getActions([basicCase])).toMatchInlineSnapshot(`
      Array [
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
      ]
    `);
  });

  it('update the severity cases', async () => {
    const updateSpy = jest.spyOn(api, 'updateCases');

    const { result, waitFor } = renderHook(
      () => useSeverityAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const actions = result.current.getActions([basicCase]);

    for (const [index, severity] of [
      CaseSeverity.LOW,
      CaseSeverity.MEDIUM,
      CaseSeverity.HIGH,
      CaseSeverity.CRITICAL,
    ].entries()) {
      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(onAction).toHaveBeenCalled();
        expect(onActionSuccess).toHaveBeenCalled();
        expect(updateSpy).toHaveBeenCalledWith({
          cases: [{ severity, id: basicCase.id, version: basicCase.version }],
        });
      });
    }
  });

  const singleCaseTests = [
    [CaseSeverity.LOW, 0, 'Case "Another horrible breach!!" was set to Low'],
    [CaseSeverity.MEDIUM, 1, 'Case "Another horrible breach!!" was set to Medium'],
    [CaseSeverity.HIGH, 2, 'Case "Another horrible breach!!" was set to High'],
    [CaseSeverity.CRITICAL, 3, 'Case "Another horrible breach!!" was set to Critical'],
  ];

  it.each(singleCaseTests)(
    'shows the success toaster correctly when updating the severity of the case: %s',
    async (_, index, expectedMessage) => {
      const { result, waitFor } = renderHook(
        () => useSeverityAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const actions = result.current.getActions([basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: expectedMessage,
          className: 'eui-textBreakWord',
        });
      });
    }
  );

  const multipleCasesTests: Array<[CaseSeverity, number, string]> = [
    [CaseSeverity.LOW, 0, '2 cases were set to Low'],
    [CaseSeverity.MEDIUM, 1, '2 cases were set to Medium'],
    [CaseSeverity.HIGH, 2, '2 cases were set to High'],
    [CaseSeverity.CRITICAL, 3, '2 cases were set to Critical'],
  ];

  it.each(multipleCasesTests)(
    'shows the success toaster correctly when updating the severity of the case: %s',
    async (_, index, expectedMessage) => {
      const { result, waitFor } = renderHook(
        () => useSeverityAction({ onAction, onActionSuccess, isDisabled: false }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const actions = result.current.getActions([basicCase, basicCase]);

      act(() => {
        // @ts-expect-error: onClick expects a MouseEvent argument
        actions[index]!.onClick();
      });

      await waitFor(() => {
        expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: expectedMessage,
          className: 'eui-textBreakWord',
        });
      });
    }
  );

  const disabledTests: Array<[CaseSeverity, number]> = [
    [CaseSeverity.LOW, 0],
    [CaseSeverity.MEDIUM, 1],
    [CaseSeverity.HIGH, 2],
    [CaseSeverity.CRITICAL, 3],
  ];

  it.each(disabledTests)('disables the severity button correctly: %s', async (severity, index) => {
    const { result } = renderHook(
      () => useSeverityAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const actions = result.current.getActions([{ ...basicCase, severity }]);
    expect(actions[index].disabled).toBe(true);
  });

  it.each(disabledTests)(
    'disables the severity button correctly if isDisabled=true: %s',
    async (severity, index) => {
      const { result } = renderHook(
        () => useSeverityAction({ onAction, onActionSuccess, isDisabled: true }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      const actions = result.current.getActions([basicCase]);
      expect(actions[index].disabled).toBe(true);
    }
  );
});
