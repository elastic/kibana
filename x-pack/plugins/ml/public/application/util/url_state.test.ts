/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { getUrlState, useUrlState } from './url_state';

const mockHistoryPush = jest.fn();

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    push: mockHistoryPush,
  }),
  useLocation: () => ({
    search:
      "?_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFieldName:action),query:(query_string:(analyze_wildcard:!t,query:'*')))&_g=(ml:(jobIds:!(dec-2)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-01-01T00:03:40.000Z',mode:absolute,to:'2019-08-30T11:55:07.000Z'))&savedSearchId=571aaf70-4c88-11e8-b3d7-01146121b73d",
  }),
}));

describe('getUrlState', () => {
  test('properly decode url with _g and _a', () => {
    expect(
      getUrlState(
        "?_a=(mlExplorerFilter:(),mlExplorerSwimlane:(viewByFieldName:action),query:(query_string:(analyze_wildcard:!t,query:'*')))&_g=(ml:(jobIds:!(dec-2)),refreshInterval:(display:Off,pause:!f,value:0),time:(from:'2019-01-01T00:03:40.000Z',mode:absolute,to:'2019-08-30T11:55:07.000Z'))&savedSearchId=571aaf70-4c88-11e8-b3d7-01146121b73d"
      )
    ).toEqual({
      _a: {
        mlExplorerFilter: {},
        mlExplorerSwimlane: {
          viewByFieldName: 'action',
        },
        query: {
          query_string: {
            analyze_wildcard: true,
            query: '*',
          },
        },
      },
      _g: {
        ml: {
          jobIds: ['dec-2'],
        },
        refreshInterval: {
          display: 'Off',
          pause: false,
          value: 0,
        },
        time: {
          from: '2019-01-01T00:03:40.000Z',
          mode: 'absolute',
          to: '2019-08-30T11:55:07.000Z',
        },
      },
      savedSearchId: '571aaf70-4c88-11e8-b3d7-01146121b73d',
    });
  });
});

describe('useUrlState', () => {
  beforeEach(() => {
    mockHistoryPush.mockClear();
  });

  test('pushes a properly encoded search string to history', () => {
    const { result } = renderHook(() => useUrlState('_a'));

    act(() => {
      const [, setUrlState] = result.current;
      setUrlState({
        query: {},
      });
    });

    expect(mockHistoryPush).toHaveBeenCalledWith({
      search:
        '_a=%28mlExplorerFilter%3A%28%29%2CmlExplorerSwimlane%3A%28viewByFieldName%3Aaction%29%2Cquery%3A%28%29%29&_g=%28ml%3A%28jobIds%3A%21%28dec-2%29%29%2CrefreshInterval%3A%28display%3AOff%2Cpause%3A%21f%2Cvalue%3A0%29%2Ctime%3A%28from%3A%272019-01-01T00%3A03%3A40.000Z%27%2Cmode%3Aabsolute%2Cto%3A%272019-08-30T11%3A55%3A07.000Z%27%29%29&savedSearchId=571aaf70-4c88-11e8-b3d7-01146121b73d',
    });
  });
});
