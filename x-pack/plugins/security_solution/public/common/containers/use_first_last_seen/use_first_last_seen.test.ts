/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { Direction } from '../../../../common/search_strategy';
import { FirstLastSeenProps } from '../../components/first_last_seen/first_last_seen';
import { useKibana } from '../../lib/kibana';
import { useFirstLastSeen } from './use_first_last_seen';

jest.mock('../../lib/kibana');

const firstSeen = '2022-06-03T19:48:36.165Z';
const lastSeen = '2022-06-13T19:48:36.165Z';

const mockSearchStrategy = jest.fn();

const mockKibana = (useKibana as jest.Mock).mockReturnValue({
  services: {
    data: {
      search: {
        search: mockSearchStrategy.mockReturnValue({
          unsubscribe: jest.fn(),
          subscribe: jest.fn(({ next, error }) => {
            try {
              next({ firstSeen });
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

  it('should return parsed items for first seen', () => {
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

  it('should return parsed items for last seen', () => {
    mockKibana.mockReturnValueOnce({
      services: {
        data: {
          search: {
            search: mockSearchStrategy.mockReturnValue({
              unsubscribe: jest.fn(),
              subscribe: jest.fn(({ next, error }) => {
                try {
                  next({ lastSeen });
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
    const { result } = renderUseFirstLastSeen();

    expect(result.current).toEqual([
      false,
      {
        errorMessage: null,
        lastSeen: '2022-06-13T19:48:36.165Z',
        id: 'firstLastSeenQuery',
        order: null,
      },
    ]);
  });
});
