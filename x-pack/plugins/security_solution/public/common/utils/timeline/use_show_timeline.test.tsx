/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useShowTimeline } from './use_show_timeline';
import { globalNode } from '../../mock';

describe('use show timeline', () => {
  it('shows timeline for routes on default', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
      await waitForNextUpdate();
      const uninitializedTimeline = result.current;
      expect(uninitializedTimeline).toEqual([true]);
    });
  });
  it('hides timeline for blacklist routes', async () => {
    await act(async () => {
      Object.defineProperty(globalNode.window, 'location', {
        value: {
          pathname: `/cases/configure`,
        },
      });
      const { result, waitForNextUpdate } = renderHook(() => useShowTimeline());
      await waitForNextUpdate();
      const uninitializedTimeline = result.current;
      expect(uninitializedTimeline).toEqual([false]);
    });
  });
});
