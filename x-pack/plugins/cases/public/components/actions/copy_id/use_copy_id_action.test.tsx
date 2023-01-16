/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { renderHook } from '@testing-library/react-hooks';
import { useCopyIDAction } from './use_copy_id_action';

import { basicCase } from '../../../containers/mock';

jest.mock('../../../containers/api');

describe('useCopyIDAction', () => {
  let appMockRender: AppMockRenderer;
  const onActionSuccess = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders a copy ID action with one case', async () => {
    const { result } = renderHook(() => useCopyIDAction({ onActionSuccess }), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.getAction(basicCase)).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "cases-action-copy-id",
        "disabled": false,
        "icon": <EuiIcon
          size="m"
          type="copyClipboard"
        />,
        "key": "cases-action-copy-id",
        "name": <EuiTextColor>
          Copy Case ID
        </EuiTextColor>,
        "onClick": [Function],
      }
    `);
  });

  it('copies the id of the selected case to the clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });

    const { result } = renderHook(() => useCopyIDAction({ onActionSuccess }), {
      wrapper: appMockRender.AppWrapper,
    });

    const action = result.current.getAction(basicCase);

    action.onClick();

    expect(onActionSuccess).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(basicCase.id);
  });

  it('shows the success toaster correctly when copying the case id', async () => {
    const { result } = renderHook(() => useCopyIDAction({ onActionSuccess }), {
      wrapper: appMockRender.AppWrapper,
    });

    const action = result.current.getAction(basicCase);

    action.onClick();

    expect(onActionSuccess).toHaveBeenCalled();
    expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
      'Copied Case ID to clipboard'
    );
  });
});
