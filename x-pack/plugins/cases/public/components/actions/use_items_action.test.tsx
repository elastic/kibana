/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { act, renderHook } from '@testing-library/react-hooks';
import { useItemsAction } from './use_items_action';

import * as api from '../../containers/api';
import { basicCase } from '../../containers/mock';

jest.mock('../../containers/api');

describe('useItemsAction', () => {
  let appMockRender: AppMockRenderer;
  const onAction = jest.fn();
  const onActionSuccess = jest.fn();
  const successToasterTitle = jest.fn().mockReturnValue('My toaster title');
  const fieldSelector = jest.fn().mockReturnValue(basicCase.tags);
  const itemsTransformer = jest.fn().mockImplementation((items) => items);

  const props = {
    isDisabled: false,
    fieldKey: 'tags' as const,
    onAction,
    onActionSuccess,
    successToasterTitle,
    fieldSelector,
    itemsTransformer,
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  describe('flyout', () => {
    it('opens the flyout', async () => {
      const { result } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.isFlyoutOpen).toBe(false);

      act(() => {
        result.current.openFlyout([basicCase]);
      });

      expect(result.current.isFlyoutOpen).toBe(true);
    });

    it('closes the flyout', async () => {
      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      expect(result.current.isFlyoutOpen).toBe(false);

      act(() => {
        result.current.openFlyout([basicCase]);
      });

      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onFlyoutClosed();
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onAction).toHaveBeenCalled();
      });
    });
  });

  describe('items', () => {
    it('update the items correctly', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([basicCase]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).toHaveBeenCalled();
        expect(fieldSelector).toHaveBeenCalled();
        expect(itemsTransformer).toHaveBeenCalled();
        expect(updateSpy).toHaveBeenCalledWith({
          cases: [
            {
              [props.fieldKey]: ['coke', 'one'],
              id: basicCase.id,
              version: basicCase.version,
            },
          ],
        });
      });
    });

    it('calls fieldSelector correctly', async () => {
      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([basicCase]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(fieldSelector).toHaveBeenCalledWith(basicCase);
      });
    });

    it('calls itemsTransformer correctly', async () => {
      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([{ ...basicCase, tags: [...basicCase.tags, 'one'] }]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(itemsTransformer).toHaveBeenCalledWith(['coke', 'one']);
      });
    });

    it('removes duplicates', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([basicCase]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one', 'one'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).toHaveBeenCalled();
        expect(updateSpy).toHaveBeenCalledWith({
          cases: [
            {
              [props.fieldKey]: ['coke', 'one'],
              id: basicCase.id,
              version: basicCase.version,
            },
          ],
        });
      });
    });

    it('shows the success toaster correctly when updating a case', async () => {
      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([basicCase]);
      });

      act(() => {
        result.current.onSaveItems({
          selectedItems: ['one', 'two'],
          unSelectedItems: ['pepsi'],
        });
      });

      await waitFor(() => {
        expect(appMockRender.coreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
          title: 'My toaster title',
          className: 'eui-textBreakWord',
        });
      });
    });

    it('do not update cases with no changes', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([{ ...basicCase, tags: [] }]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: [], unSelectedItems: ['pepsi'] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    it('do not update if the selected items are the same but with different order', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([{ ...basicCase, tags: ['1', '2'] }]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: ['2', '1'], unSelectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    it('do not update if the selected items are the same', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([{ ...basicCase, tags: ['1'] }]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: ['1'], unSelectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    it('do not update if selecting and unselecting the same item', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([{ ...basicCase, tags: ['1'] }]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: ['1'], unSelectedItems: ['1'] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    it('do not update with empty items and no selection', async () => {
      const updateSpy = jest.spyOn(api, 'updateCases');

      const { result, waitFor } = renderHook(() => useItemsAction(props), {
        wrapper: appMockRender.AppWrapper,
      });

      act(() => {
        result.current.openFlyout([{ ...basicCase, tags: [] }]);
      });

      expect(onAction).toHaveBeenCalled();
      expect(result.current.isFlyoutOpen).toBe(true);

      act(() => {
        result.current.onSaveItems({ selectedItems: [], unSelectedItems: [] });
      });

      await waitFor(() => {
        expect(result.current.isFlyoutOpen).toBe(false);
        expect(onActionSuccess).not.toHaveBeenCalled();
        expect(updateSpy).not.toHaveBeenCalled();
      });
    });
  });
});
