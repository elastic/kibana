/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { Direction } from '../../../../common/search_strategy';
import type { FirstLastSeenProps } from '../../components/first_last_seen/first_last_seen';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import * as i18n from './translations';
import type { UseFirstLastSeen } from './use_first_last_seen';
import { useFirstLastSeen } from './use_first_last_seen';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_app_toasts');

const firstSeen = '2022-06-03T19:48:36.165Z';
const lastSeen = '2022-06-13T19:48:36.165Z';

const mockSearchStrategy = jest.fn();

const mockAddError = jest.fn();
const mockAddWarning = jest.fn();

(useAppToasts as jest.Mock).mockReturnValue({
  addError: mockAddError,
  addWarning: mockAddWarning,
});

const mockKibana = (useKibana as jest.Mock).mockReturnValue({
  services: {
    data: {
      search: {
        search: mockSearchStrategy.mockReturnValue({
          unsubscribe: jest.fn(),
          subscribe: jest.fn(({ next, error }) => {
            next({ firstSeen });
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

const renderUseFirstLastSeen = (overrides?: Partial<UseFirstLastSeen>) =>
  renderHook<FirstLastSeenProps, ReturnType<typeof useFirstLastSeen>>(() =>
    useFirstLastSeen({
      order: Direction.asc,
      field: 'host.name',
      value: 'some-host',
      defaultIndex: [],
      ...overrides,
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

    expect(mockSearchStrategy).toHaveBeenCalledWith(
      {
        defaultIndex: [],
        factoryQueryType: 'firstlastseen',
        field: 'host.name',
        order: 'asc',
        value: 'some-host',
      },
      {
        abortSignal: new AbortController().signal,
        strategy: 'securitySolutionSearchStrategy',
      }
    );

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
                next({ lastSeen });
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
    const { result } = renderUseFirstLastSeen({ order: Direction.desc });

    expect(mockSearchStrategy).toHaveBeenCalledWith(
      {
        defaultIndex: [],
        factoryQueryType: 'firstlastseen',
        field: 'host.name',
        order: 'desc',
        value: 'some-host',
      },
      {
        abortSignal: new AbortController().signal,
        strategy: 'securitySolutionSearchStrategy',
      }
    );

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
  it('should handle a partial, no longer running response', () => {
    mockKibana.mockReturnValueOnce({
      services: {
        data: {
          search: {
            search: mockSearchStrategy.mockReturnValue({
              unsubscribe: jest.fn(),
              subscribe: jest.fn(({ next, error }) => {
                next({ isRunning: false, isPartial: true });
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

    renderUseFirstLastSeen({ order: Direction.desc });
    expect(mockAddWarning).toHaveBeenCalledWith(i18n.ERROR_FIRST_LAST_SEEN_HOST);
  });

  it('should handle an error with search strategy', () => {
    const msg = 'What in tarnation!?';
    mockKibana.mockReturnValueOnce({
      services: {
        data: {
          search: {
            search: mockSearchStrategy.mockReturnValue({
              unsubscribe: jest.fn(),
              subscribe: jest.fn(({ next, error }) => {
                error(msg);
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

    renderUseFirstLastSeen({ order: Direction.desc });
    expect(mockAddError).toHaveBeenCalledWith(msg, {
      title: i18n.FAIL_FIRST_LAST_SEEN_HOST,
    });
  });
});
