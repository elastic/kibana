/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useOsqueryTab } from './use_osquery_tab';
import { mockSearchHit } from '../../shared/mocks/mock_search_hit';
import { mockDataAsNestedObject } from '../../shared/mocks/mock_data_as_nested_object';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana } from '../../../../common/lib/kibana';
import type { ExperimentalFeatures } from '../../../../../common';
import { allowedExperimentalValues } from '../../../../../common';
import { ResponseActionTypesEnum } from '../../../../../common/api/detection_engine';

const ecsData = mockDataAsNestedObject;
const rawEventData = mockSearchHit;

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));
jest.mock('../../../../management/hooks/response_actions/use_get_automated_action_list');
jest.mock('../../../../common/lib/kibana');

const rawEventDataWithResponseActions = {
  ...rawEventData,
  fields: {
    'kibana.alert.rule.parameters': [
      {
        response_actions: [
          {
            action_type_id: ResponseActionTypesEnum['.osquery'],
          },
        ],
      },
    ],
  },
};

describe('useOsqueryTab', () => {
  beforeEach(() => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      jest.fn((feature: keyof ExperimentalFeatures) => {
        if (feature === 'responseActionsEnabled') return true;
        if (feature === 'endpointResponseActionsEnabled') return false;
        return allowedExperimentalValues[feature];
      })
    );
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        osquery: {
          OsqueryResults: {},
          fetchAllLiveQueries: jest.fn().mockReturnValue({ data: { data: {} } }),
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the normal component', () => {
    const { result } = renderHook(() =>
      useOsqueryTab({
        ecsData,
        rawEventData: rawEventDataWithResponseActions,
      })
    );

    expect(result.current?.id).toEqual('osquery-results-view');
    expect(result.current?.name).toEqual('Osquery Results');
    expect(result.current?.append).toBeDefined();
    expect(result.current?.content).toBeDefined();
  });

  it('should return undefined if rawEventData is undefined', () => {
    const { result } = renderHook(() =>
      useOsqueryTab({
        ecsData,
        rawEventData: undefined,
      })
    );

    expect(result.current).toEqual(undefined);
  });

  it('should return undefined if responseActionsEnabled feature flag is off', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      jest.fn((feature: keyof ExperimentalFeatures) => {
        if (feature === 'responseActionsEnabled') return false;
        return allowedExperimentalValues[feature];
      })
    );

    const { result } = renderHook(() =>
      useOsqueryTab({
        ecsData,
        rawEventData: rawEventDataWithResponseActions,
      })
    );

    expect(result.current).toEqual(undefined);
  });

  it('should return undefined if endpointResponseActionsEnabled feature flag is on', () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      jest.fn((feature: keyof ExperimentalFeatures) => {
        if (feature === 'endpointResponseActionsEnabled') return true;
        return allowedExperimentalValues[feature];
      })
    );

    const { result } = renderHook(() =>
      useOsqueryTab({
        ecsData,
        rawEventData: rawEventDataWithResponseActions,
      })
    );

    expect(result.current).toEqual(undefined);
  });

  it('should return undefined if ecsData is undefined', () => {
    const { result } = renderHook(() =>
      useOsqueryTab({
        ecsData: null,
        rawEventData: rawEventDataWithResponseActions,
      })
    );

    expect(result.current).toEqual(undefined);
  });

  it('should return undefined if there are no response actions', () => {
    const rawEventDataWithNoResponseActions = {
      ...rawEventData,
      fields: {
        'kibana.alert.rule.parameters': [
          {
            response_actions: [],
          },
        ],
      },
    };

    const { result } = renderHook(() =>
      useOsqueryTab({
        ecsData,
        rawEventData: rawEventDataWithNoResponseActions,
      })
    );

    expect(result.current).toEqual(undefined);
  });
});
