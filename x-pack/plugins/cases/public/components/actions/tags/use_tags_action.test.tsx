/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { useTagsAction } from './use_tags_action';

import * as api from '../../../containers/api';
import { basicCase } from '../../../containers/mock';

jest.mock('../../../containers/api');

describe('useTagsAction', () => {
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
        useTagsAction({
          onAction,
          onActionSuccess,
          isDisabled: false,
        }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    expect(result.current.getAction([basicCase])).toMatchInlineSnapshot(`
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
      }
    `);
  });

  it('closes the flyout', async () => {
    const { result, waitFor } = renderHook(
      () => useTagsAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    expect(result.current.isFlyoutOpen).toBe(true);

    act(() => {
      result.current.onFlyoutClosed();
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
    });
  });

  it('update the tags correctly', async () => {
    const updateSpy = jest.spyOn(api, 'updateCases');

    const { result, waitFor } = renderHook(
      () => useTagsAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    expect(onAction).toHaveBeenCalled();
    expect(result.current.isFlyoutOpen).toBe(true);

    act(() => {
      result.current.onSaveTags({ selectedTags: ['one'], unSelectedTags: ['pepsi'] });
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
      expect(onActionSuccess).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        [{ tags: ['coke', 'one'], id: basicCase.id, version: basicCase.version }],
        expect.anything()
      );
    });
  });

  it('removes duplicates', async () => {
    const updateSpy = jest.spyOn(api, 'updateCases');

    const { result, waitFor } = renderHook(
      () => useTagsAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    expect(onAction).toHaveBeenCalled();
    expect(result.current.isFlyoutOpen).toBe(true);

    act(() => {
      result.current.onSaveTags({ selectedTags: ['one', 'one'], unSelectedTags: ['pepsi'] });
    });

    await waitFor(() => {
      expect(result.current.isFlyoutOpen).toBe(false);
      expect(onActionSuccess).toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        [{ tags: ['coke', 'one'], id: basicCase.id, version: basicCase.version }],
        expect.anything()
      );
    });
  });

  it('shows the success toaster correctly when updating one case', async () => {
    const { result, waitFor } = renderHook(
      () => useTagsAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const action = result.current.getAction([basicCase]);

    act(() => {
      action.onClick();
    });

    act(() => {
      result.current.onSaveTags({ selectedTags: ['one', 'one'], unSelectedTags: ['pepsi'] });
    });

    await waitFor(() => {
      expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        'Edited case'
      );
    });
  });

  it('shows the success toaster correctly when updating multiple cases', async () => {
    const { result, waitFor } = renderHook(
      () => useTagsAction({ onAction, onActionSuccess, isDisabled: false }),
      {
        wrapper: appMockRender.AppWrapper,
      }
    );

    const action = result.current.getAction([basicCase, basicCase]);

    act(() => {
      action.onClick();
    });

    act(() => {
      result.current.onSaveTags({ selectedTags: ['one', 'one'], unSelectedTags: ['pepsi'] });
    });

    await waitFor(() => {
      expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        'Edited 2 cases'
      );
    });
  });
});
