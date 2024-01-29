/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseCreateTimelineParams } from './use_create_timeline';
import { useCreateTimeline } from './use_create_timeline';
import type { TimeRange } from '../../common/store/inputs/model';
import { TimelineType } from '../../../common/api/timeline';
import { TimelineId } from '../../../common/types';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { useDiscoverInTimelineContext } from '../../common/components/discover_in_timeline/use_discover_in_timeline_context';
import { timelineActions } from '../store';
import { inputsActions } from '../../common/store/inputs';
import { sourcererActions } from '../../common/store/sourcerer';
import { appActions } from '../../common/store/app';
import { defaultHeaders } from '../components/timeline/body/column_headers/default_headers';
import { SourcererScopeName } from '../../common/store/sourcerer/model';
import { InputsModelId } from '../../common/store/inputs/constants';

jest.mock('../../common/components/discover_in_timeline/use_discover_in_timeline_context');
jest.mock('../../common/hooks/use_selector');
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useSelector: jest.fn(),
    useDispatch: () => jest.fn(),
  };
});

describe('useCreateTimeline', () => {
  let hookResult: RenderHookResult<
    UseCreateTimelineParams,
    (options?: { timeRange?: TimeRange }) => void
  >;

  const resetDiscoverAppState = jest.fn();
  (useDiscoverInTimelineContext as jest.Mock).mockReturnValue({ resetDiscoverAppState });

  it('should return a function', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({});

    hookResult = renderHook(() =>
      useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineType.default })
    );

    expect(hookResult.result.current).toEqual(expect.any(Function));
  });

  it('should dispatch correct actions when calling the returned function', () => {
    const dataViewId = 'dataViewId';
    const selectedPatterns = ['selectedPatterns'];
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      id: dataViewId,
      patternList: selectedPatterns,
    });

    const createTimeline = jest.spyOn(timelineActions, 'createTimeline');
    const setSelectedDataView = jest.spyOn(sourcererActions, 'setSelectedDataView');
    const addLinkTo = jest.spyOn(inputsActions, 'addLinkTo');
    const addNotes = jest.spyOn(appActions, 'addNotes');

    hookResult = renderHook(() =>
      useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineType.default })
    );

    expect(hookResult.result.current).toEqual(expect.any(Function));

    hookResult.result.current();

    expect(createTimeline).toHaveBeenCalledWith({
      columns: defaultHeaders,
      dataViewId,
      id: TimelineId.test,
      indexNames: selectedPatterns,
      show: true,
      timelineType: 'default',
      updated: undefined,
    });
    expect(setSelectedDataView).toHaveBeenCalledWith({
      id: SourcererScopeName.timeline,
      selectedDataViewId: dataViewId,
      selectedPatterns,
    });
    expect(addLinkTo).toHaveBeenCalledWith([InputsModelId.global, InputsModelId.timeline]);
    expect(addNotes).toHaveBeenCalledWith({ notes: [] });
  });

  it('should run the onClick method if provided', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({});

    const onClick = jest.fn();
    hookResult = renderHook(() =>
      useCreateTimeline({
        timelineId: TimelineId.test,
        timelineType: TimelineType.default,
        onClick,
      })
    );

    hookResult.result.current();

    expect(onClick).toHaveBeenCalled();
    expect(resetDiscoverAppState).toHaveBeenCalled();
  });

  it('should dispatch removeLinkTo action if absolute timeRange is passed to callback', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({});

    const removeLinkTo = jest.spyOn(inputsActions, 'removeLinkTo');
    const setAbsoluteRangeDatePicker = jest.spyOn(inputsActions, 'setAbsoluteRangeDatePicker');

    hookResult = renderHook(() =>
      useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineType.default })
    );

    const timeRange: TimeRange = { kind: 'absolute', from: '', to: '' };
    hookResult.result.current({ timeRange });

    expect(removeLinkTo).toHaveBeenCalledWith([InputsModelId.timeline, InputsModelId.global]);
    expect(setAbsoluteRangeDatePicker).toHaveBeenCalledWith({
      ...timeRange,
      id: InputsModelId.timeline,
    });
  });

  it('should dispatch removeLinkTo action if relative timeRange is passed to callback', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({});

    const setRelativeRangeDatePicker = jest.spyOn(inputsActions, 'setRelativeRangeDatePicker');

    hookResult = renderHook(() =>
      useCreateTimeline({ timelineId: TimelineId.test, timelineType: TimelineType.default })
    );

    const timeRange: TimeRange = { kind: 'relative', fromStr: '', toStr: '', from: '', to: '' };
    hookResult.result.current({ timeRange });

    expect(setRelativeRangeDatePicker).toHaveBeenCalledWith({
      ...timeRange,
      id: InputsModelId.timeline,
    });
  });
});
