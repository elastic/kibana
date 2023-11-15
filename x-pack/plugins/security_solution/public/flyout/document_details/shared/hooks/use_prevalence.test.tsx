/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { usePrevalence } from './use_prevalence';
import { mockDataFormattedForFieldBrowser } from '../mocks/mock_data_formatted_for_field_browser';
import { useHighlightedFields } from './use_highlighted_fields';
import {
  FIELD_NAMES_AGG_KEY,
  HOSTS_AGG_KEY,
  useFetchPrevalence,
  USERS_AGG_KEY,
} from './use_fetch_prevalence';

jest.mock('./use_highlighted_fields');
jest.mock('./use_fetch_prevalence');

const interval = {
  from: 'now-30d',
  to: 'now',
};
const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const investigationFields = ['host.name', 'user.name'];

describe('usePrevalence', () => {
  it('should return loading true', () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({
      'host.name': {
        values: ['host-1'],
      },
    });
    (useFetchPrevalence as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      data: undefined,
    });

    const hookResult = renderHook(() =>
      usePrevalence({ interval, dataFormattedForFieldBrowser, investigationFields })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual([]);
  });

  it('should return error true', () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({
      'host.name': {
        values: ['host-1'],
      },
    });
    (useFetchPrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: undefined,
    });

    const hookResult = renderHook(() =>
      usePrevalence({ interval, dataFormattedForFieldBrowser, investigationFields })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.data).toEqual([]);
  });

  it('should return data', () => {
    (useHighlightedFields as jest.Mock).mockReturnValue({
      'host.name': {
        values: ['host-1'],
      },
    });
    (useFetchPrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: {
        aggregations: {
          [FIELD_NAMES_AGG_KEY]: {
            buckets: {
              'host.name': {
                eventKind: {
                  buckets: [
                    {
                      key: 'signal',
                      doc_count: 1,
                    },
                    {
                      key: 'event',
                      doc_count: 1,
                    },
                  ],
                },
                hostName: {
                  value: 10,
                },
                userName: {
                  value: 20,
                },
              },
            },
          },
          [HOSTS_AGG_KEY]: {
            value: 100,
          },
          [USERS_AGG_KEY]: {
            value: 200,
          },
        },
      },
    });

    const hookResult = renderHook(() =>
      usePrevalence({ interval, dataFormattedForFieldBrowser, investigationFields })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual([
      {
        field: 'host.name',
        values: ['host-1'],
        alertCount: 1,
        docCount: 1,
        hostPrevalence: 0.1,
        userPrevalence: 0.1,
      },
    ]);
  });
});
