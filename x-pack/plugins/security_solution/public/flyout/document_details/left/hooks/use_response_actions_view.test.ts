/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useResponseActionsView } from './use_response_actions_view';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { mockDataAsNestedObject } from '../../shared/mocks/mock_data_as_nested_object';
import { useGetAutomatedActionList } from '../../../../management/hooks/response_actions/use_get_automated_action_list';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const ecsData = mockDataAsNestedObject;
const rawEventData = mockSearchHit;

jest.mock('../../../../common/hooks/use_experimental_features');
jest.mock('../../../../management/hooks/response_actions/use_get_automated_action_list');

describe('useResponseActionsView', () => {
  it('should return the normal component', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useGetAutomatedActionList as jest.Mock).mockReturnValue({
      data: [],
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useResponseActionsView({
        ecsData,
        rawEventData,
      })
    );

    expect(result.current.id).toEqual('response-actions-results-view');
    expect(result.current.name).toEqual('Response Results');
    expect(result.current.append).toBeDefined();
    expect(result.current.content).toBeDefined();
  });

  it('returns early return if rawEventData is undefined', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    (useGetAutomatedActionList as jest.Mock).mockReturnValue({
      data: [],
      isFetched: true,
    });

    const { result } = renderHook(() =>
      useResponseActionsView({
        ecsData,
        rawEventData: undefined,
      })
    );

    expect(result.current.id).toEqual('response-actions-results-view');
    expect(result.current.name).toEqual('Response Results');
    expect(result.current.append).not.toBeDefined();
    expect(result.current.content).toBeDefined();
  });
});
