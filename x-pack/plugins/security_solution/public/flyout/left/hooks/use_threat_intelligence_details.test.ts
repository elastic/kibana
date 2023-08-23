/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useThreatIntelligenceDetails } from './use_threat_intelligence_details';
import { renderHook } from '@testing-library/react-hooks';

import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { useRouteSpy } from '../../../common/utils/route/use_route_spy';
import { useLeftPanelContext } from '../context';
import { useInvestigationTimeEnrichment } from '../../../common/containers/cti/event_enrichment';
import { SecurityPageName } from '../../../../common/constants';
import type { RouteSpyState } from '../../../common/utils/route/types';
import {
  type GetBasicDataFromDetailsData,
  useBasicDataFromDetailsData,
} from '../../../timelines/components/side_panel/event_details/helpers';

jest.mock('../../../timelines/containers/details');
jest.mock('../../../common/containers/sourcerer');
jest.mock('../../../common/utils/route/use_route_spy');
jest.mock('../context');
jest.mock('../../../common/containers/cti/event_enrichment');
jest.mock('../../../timelines/components/side_panel/event_details/helpers');

describe('useThreatIntelligenceDetails', () => {
  beforeEach(() => {
    jest.mocked(useInvestigationTimeEnrichment).mockReturnValue({
      result: { enrichments: [] },
      loading: false,
      setRange: jest.fn(),
      range: { from: '2023-04-27T00:00:00Z', to: '2023-04-27T23:59:59Z' },
    });

    jest
      .mocked(useTimelineEventsDetails)
      .mockReturnValue([false, [], undefined, null, async () => {}]);

    jest
      .mocked(useBasicDataFromDetailsData)
      .mockReturnValue({ isAlert: true } as unknown as GetBasicDataFromDetailsData);

    jest.mocked(useSourcererDataView).mockReturnValue({
      runtimeMappings: {},
      browserFields: {},
      dataViewId: '',
      loading: false,
      indicesExist: true,
      patternList: [],
      selectedPatterns: [],
      indexPattern: { fields: [], title: '' },
      sourcererDataView: undefined,
    });

    jest
      .mocked(useRouteSpy)
      .mockReturnValue([
        { pageName: SecurityPageName.detections } as unknown as RouteSpyState,
        () => {},
      ]);

    jest.mocked(useLeftPanelContext).mockReturnValue({
      indexName: 'test-index',
      eventId: 'test-event-id',
      getFieldsData: () => null,
      dataFormattedForFieldBrowser: null,
      scopeId: 'test-scope-id',
      browserFields: null,
      searchHit: {
        _id: 'testId',
        _index: 'testIndex',
      },
      dataAsNestedObject: null,
      investigationFields: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected values', () => {
    const { result } = renderHook(() => useThreatIntelligenceDetails());

    expect(result.current.enrichments).toEqual([]);
    expect(result.current.eventFields).toEqual({});
    expect(result.current.isEnrichmentsLoading).toBe(false);
    expect(result.current.isEventDataLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.range).toEqual({
      from: '2023-04-27T00:00:00Z',
      to: '2023-04-27T23:59:59Z',
    });
    expect(typeof result.current.setRange).toBe('function');
  });
});
