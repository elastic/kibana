/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseTimelineTitleParams } from './use_timeline_title';
import { useTimelineTitle } from './use_timeline_title';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { TimelineType } from '../../../common/api/timeline';

jest.mock('../../common/hooks/use_selector');

const timelineId = 'timelineId';

describe('useTimelineTitle', () => {
  let hookResult: RenderHookResult<UseTimelineTitleParams, string>;

  it('should return saved title', () => {
    const savedTitle = 'My saved timeline';
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      title: savedTitle,
    });

    hookResult = renderHook((props: UseTimelineTitleParams) => useTimelineTitle(props), {
      initialProps: { timelineId },
    });

    expect(hookResult.result.current).toEqual(savedTitle);
  });

  it('should return untitled timeline', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      timelineType: TimelineType.default,
    });

    hookResult = renderHook((props: UseTimelineTitleParams) => useTimelineTitle(props), {
      initialProps: { timelineId },
    });

    expect(hookResult.result.current).toEqual('Untitled timeline');
  });

  it('should return untitled template', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      timelineType: TimelineType.template,
    });

    hookResult = renderHook((props: UseTimelineTitleParams) => useTimelineTitle(props), {
      initialProps: { timelineId },
    });

    expect(hookResult.result.current).toEqual('Untitled template');
  });
});
