/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRouteSpy } from '../../../../utils/route/use_route_spy';
import { wrapper } from '../../mocks';

import { useLensAttributes } from '../../use_lens_attributes';

import { getEventsHistogramLensAttributes } from './events';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('0039eb0c-9a1a-4687-ae54-0f4e239bec75'),
}));

jest.mock('../../../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({
    selectedPatterns: ['auditbeat-mytest-*'],
    dataViewId: 'security-solution-my-test',
    indicesExist: true,
  }),
}));

jest.mock('../../../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn().mockReturnValue([
    {
      detailName: 'mockHost',
      pageName: 'hosts',
      tabName: 'events',
    },
  ]),
}));

describe('getEventsHistogramLensAttributes', () => {
  it('should render query and filters for hosts events histogram', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: undefined,
        pageName: 'hosts',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );
    expect(result?.current?.state.query).toEqual(
      expect.objectContaining({
        language: 'kql',
        query: 'host.name: *',
      })
    );

    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'host.name',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });

  it('should render query and filters for host details events histogram', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query).toEqual(
      expect.objectContaining({
        language: 'kql',
        query: 'host.name: *',
      })
    );

    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'host.name',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });

  it('should render attributes for network events histogram', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: undefined,
        pageName: 'network',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );
    expect(result?.current?.state.query).toEqual(
      expect.objectContaining({
        language: 'kql',
        query: 'host.name: *',
      })
    );

    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });

  it('should render attributes for network details events histogram', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'mockIp',
        pageName: 'network',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query).toEqual(
      expect.objectContaining({
        language: 'kql',
        query: 'host.name: *',
      })
    );

    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  'source.ip': 'mockIp',
                },
              },
              {
                match_phrase: {
                  'destination.ip': 'mockIp',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[3]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });

  it('should render attributes for users events histogram', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: undefined,
        pageName: 'users',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );
    expect(result?.current?.state.query).toEqual(
      expect.objectContaining({
        language: 'kql',
        query: 'host.name: *',
      })
    );

    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'user.name',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });
  it('should render attributes for user details events histogram', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'mockUser',
        pageName: 'users',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query).toEqual(
      expect.objectContaining({
        language: 'kql',
        query: 'host.name: *',
      })
    );

    expect(result?.current?.state.filters[0]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'user.name': 'mockUser',
          },
        },
      })
    );

    expect(result?.current?.state.filters[1]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                exists: {
                  field: 'user.name',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[2]).toEqual(
      expect.objectContaining({
        query: {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_phrase: {
                  _index: 'auditbeat-mytest-*',
                },
              },
            ],
          },
        },
      })
    );

    expect(result?.current?.state.filters[3]).toEqual(
      expect.objectContaining({
        query: {
          match_phrase: {
            'host.id': '123',
          },
        },
      })
    );
  });

  it('should render values in legend', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state?.visualization).toEqual(
      expect.objectContaining({
        legend: expect.objectContaining({ legendStats: ['currentAndLastValue'] }),
      })
    );
  });
});
