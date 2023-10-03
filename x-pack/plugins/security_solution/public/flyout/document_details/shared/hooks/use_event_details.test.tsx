/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseEventDetailsParams, UseEventDetailsResult } from './use_event_details';
import { useEventDetails } from './use_event_details';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useGetFieldsData } from '../../../../common/hooks/use_get_fields_data';

jest.mock('../../../../common/hooks/use_space_id');
jest.mock('../../../../common/utils/route/use_route_spy');
jest.mock('../../../../common/containers/sourcerer');
jest.mock('../../../../timelines/containers/details');
jest.mock('../../../../common/hooks/use_get_fields_data');

const eventId = 'eventId';
const indexName = 'indexName';

describe('useEventDetails', () => {
  let hookResult: RenderHookResult<UseEventDetailsParams, UseEventDetailsResult>;

  it('should return all properties', () => {
    jest.mocked(useSpaceId).mockReturnValue('default');
    (useRouteSpy as jest.Mock).mockReturnValue([{ pageName: 'alerts' }]);
    (useSourcererDataView as jest.Mock).mockReturnValue({
      browserFields: {},
      indexPattern: {},
    });
    (useTimelineEventsDetails as jest.Mock).mockReturnValue([false, [], {}, {}, jest.fn()]);
    jest.mocked(useGetFieldsData).mockReturnValue((field: string) => field);

    hookResult = renderHook(() => useEventDetails({ eventId, indexName }));

    expect(hookResult.result.current.browserFields).toEqual({});
    expect(hookResult.result.current.dataAsNestedObject).toEqual({});
    expect(hookResult.result.current.dataFormattedForFieldBrowser).toEqual([]);
    expect(hookResult.result.current.getFieldsData('test')).toEqual('test');
    expect(hookResult.result.current.indexPattern).toEqual({});
    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.refetchFlyoutData()).toEqual(undefined);
    expect(hookResult.result.current.searchHit).toEqual({});
  });
});
