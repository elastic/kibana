/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { Direction } from '../../../../common/search_strategy';
import { FirstLastSeenProps } from '../../components/first_last_seen';
import { useKibana } from '../../lib/kibana';
import { useFirstLastSeen } from '.';

jest.mock('../../lib/kibana');

const mockSearchStrategy = jest.fn();

(useKibana as jest.Mock).mockReturnValue({
  services: {
    data: {
      search: {
        search: mockSearchStrategy.mockReturnValue({
          unsubscribe: jest.fn(),
          subscribe: jest.fn(({ next, error }) => {
            try {
              next(defaultReturn);
              /* eslint-disable no-empty */
            } catch (e) {}
            return {
              unsubscribe: jest.fn(),
            };
          }),
        }),
      },
      query: jest.fn(),
    },
  },
});

const renderUseFirstLastSeen = () =>
  renderHook<FirstLastSeenProps, ReturnType<typeof useFirstLastSeen>>(() =>
    useFirstLastSeen({
      order: Direction.asc,
      field: 'host.name',
      value: 'some-host',
      defaultIndex: [],
      docValueFields: [],
    })
  );

describe('useFistLastSeen', () => {
  it('should return default values', () => {
    mockSearchStrategy.mockReturnValueOnce({
      subscribe: jest.fn(),
    });
    const { result } = renderUseFirstLastSeen();

    expect(result.current).toEqual([
      true,
      {
        errorMessage: null,
        firstSeen: null,
        id: 'firstLastSeenQuery',
        lastSeen: null,
        order: null,
      },
    ]);
  });

  it('should return parsed items', () => {
    const { result } = renderUseFirstLastSeen();

    expect(result.current).toEqual([
      false,
      {
        errorMessage: null,
        firstSeen: '2022-06-03T19:48:36.165Z',
        id: 'firstLastSeenQuery',
        order: null,
      },
    ]);
  });
});

const defaultReturn = {
  rawResponse: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 4,
      successful: 4,
      skipped: 0,
      failed: 0,
    },
    hits: {
      max_score: null,
      hits: [
        {
          _index: '.ds-logs-endpoint.events.process-default-2022.06.03-000001',
          _id: 'BTUcK4EBPzpK1u8_xlT0',
          _score: null,
          _source: {
            '@timestamp': 1654285716165,
          },
          fields: {
            '@timestamp': ['2022-06-03T19:48:36.165Z'],
          },
          sort: [1654285716165],
        },
      ],
    },
  },
  isPartial: false,
  isRunning: false,
  firstSeen: '2022-06-03T19:48:36.165Z',
};
