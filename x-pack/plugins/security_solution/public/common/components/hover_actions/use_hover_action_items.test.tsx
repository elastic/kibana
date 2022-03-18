/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useRef } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useHoverActionItems, UseHoverActionItemsProps } from './use_hover_action_items';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { DataProvider } from '../../../../common/types/timeline';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_selector');
jest.mock('../../containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({ browserFields: {} }),
}));

describe('useHoverActionItems', () => {
  const defaultProps: UseHoverActionItemsProps = {
    dataProvider: [{} as DataProvider],
    defaultFocusedButtonRef: null,
    field: 'kibana.alert.rule.name',
    handleHoverActionClicked: jest.fn(),
    hideAddToTimeline: false,
    hideTopN: false,
    isCaseView: false,
    isObjectArray: false,
    ownFocus: false,
    showTopN: false,
    stKeyboardEvent: undefined,
    toggleColumn: jest.fn(),
    toggleTopN: jest.fn(),
    values: ['rule name'],
  } as unknown as UseHoverActionItemsProps;

  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockImplementation((cb) => {
      return cb();
    });
  });
  afterEach(() => {
    (useDeepEqualSelector as jest.Mock).mockClear();
  });

  test('should return allActionItems', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const defaultFocusedButtonRef = useRef(null);
        const testProps = {
          ...defaultProps,
          defaultFocusedButtonRef,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.allActionItems).toHaveLength(6);
      expect(result.current.allActionItems[0].props['data-test-subj']).toEqual(
        'hover-actions-filter-for'
      );
      expect(result.current.allActionItems[1].props['data-test-subj']).toEqual(
        'hover-actions-filter-out'
      );
      expect(result.current.allActionItems[2].props['data-test-subj']).toEqual(
        'hover-actions-toggle-column'
      );
      expect(result.current.allActionItems[3].props['data-test-subj']).toEqual(
        'hover-actions-add-timeline'
      );
      expect(result.current.allActionItems[4].props['data-test-subj']).toEqual(
        'hover-actions-show-top-n'
      );
      expect(result.current.allActionItems[5].props['data-test-subj']).toEqual(
        'hover-actions-copy-button'
      );
    });
  });

  test('should return overflowActionItems', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const defaultFocusedButtonRef = useRef(null);
        const testProps = {
          ...defaultProps,
          defaultFocusedButtonRef,
          enableOverflowButton: true,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.overflowActionItems).toHaveLength(3);
      expect(result.current.overflowActionItems[0].props['data-test-subj']).toEqual(
        'hover-actions-filter-for'
      );
      expect(result.current.overflowActionItems[1].props['data-test-subj']).toEqual(
        'hover-actions-filter-out'
      );
      expect(result.current.overflowActionItems[2].props['data-test-subj']).toEqual(
        'more-actions-kibana.alert.rule.name'
      );
      expect(result.current.overflowActionItems[2].props.items[0].props['data-test-subj']).toEqual(
        'hover-actions-toggle-column'
      );

      expect(result.current.overflowActionItems[2].props.items[1].props['data-test-subj']).toEqual(
        'hover-actions-add-timeline'
      );
      expect(result.current.overflowActionItems[2].props.items[2].props['data-test-subj']).toEqual(
        'hover-actions-show-top-n'
      );
      expect(result.current.overflowActionItems[2].props.items[3].props['data-test-subj']).toEqual(
        'hover-actions-copy-button'
      );
    });
  });

  test('it should hide the Top N action when hideTopN is true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          hideTopN: true, // <-- hide the Top N action
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      result.current.allActionItems.forEach((item) => {
        expect(item.props['data-test-subj']).not.toEqual('hover-actions-show-top-n');
      });
    });
  });

  test('should not have toggle column', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const defaultFocusedButtonRef = useRef(null);
        const testProps = {
          ...defaultProps,
          isObjectArray: true,
          defaultFocusedButtonRef,
          enableOverflowButton: true,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.overflowActionItems).toHaveLength(3);
      expect(result.current.overflowActionItems[0].props['data-test-subj']).toEqual(
        'hover-actions-filter-for'
      );
      expect(result.current.overflowActionItems[1].props['data-test-subj']).toEqual(
        'hover-actions-filter-out'
      );

      result.current.overflowActionItems[2].props.items.forEach((item: JSX.Element) => {
        expect(item.props['data-test-subj']).not.toEqual('hover-actions-toggle-column');
      });
    });
  });

  test('should not have filter in, filter out, or toggle column', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          isCaseView: true,
          enableOverflowButton: false,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.allActionItems).toHaveLength(3);
      expect(result.current.allActionItems[0].props['data-test-subj']).toEqual(
        'hover-actions-add-timeline'
      );
      expect(result.current.allActionItems[1].props['data-test-subj']).toEqual(
        'hover-actions-show-top-n'
      );
      expect(result.current.allActionItems[2].props['data-test-subj']).toEqual(
        'hover-actions-copy-button'
      );
    });
  });

  test('if not on CaseView, overflow button is enabled, ShowTopNButton should disable popOver (e.g.: alerts flyout)', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          enableOverflowButton: true,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();
      expect(result.current.allActionItems[4].props.enablePopOver).toEqual(false);
    });
  });

  test('if not on CaseView, overflow button is disabled, ShowTopNButton should disable popOver (e.g.: alerts table - reason field)', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          enableOverflowButton: false,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();
      expect(result.current.allActionItems[4].props.enablePopOver).toEqual(false);
    });
  });

  test('if on CaseView, ShowTopNButton should enable popOver', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          isCaseView: true,
          enableOverflowButton: false,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.allActionItems[1].props.enablePopOver).toEqual(true);
    });
  });

  test('if on CaseView, it should show all items when shoTopN is true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          showTopN: true,
          isCaseView: true,
          enableOverflowButton: false,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.allActionItems).toHaveLength(3);
      expect(result.current.allActionItems[0].props['data-test-subj']).toEqual(
        'hover-actions-add-timeline'
      );
      expect(result.current.allActionItems[1].props['data-test-subj']).toEqual(
        'hover-actions-show-top-n'
      );
      expect(result.current.allActionItems[2].props['data-test-subj']).toEqual(
        'hover-actions-copy-button'
      );
    });
  });

  test('when disable OverflowButton, it should show only "showTopNBtn" when shoTopN is true', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          showTopN: true,
          isCaseView: false,
          enableOverflowButton: false,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      expect(result.current.allActionItems).toHaveLength(1);
      expect(result.current.allActionItems[0].props['data-test-subj']).toEqual(
        'hover-actions-show-top-n'
      );
    });
  });

  test('when timeline button is disabled, it should not show', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => {
        const testProps = {
          ...defaultProps,
          hideAddToTimeline: true,
        };
        return useHoverActionItems(testProps);
      });
      await waitForNextUpdate();

      result.current.allActionItems.forEach((actionItem) => {
        expect(actionItem.props['data-test-subj']).not.toEqual('hover-actions-add-timeline');
      });
    });
  });
});
