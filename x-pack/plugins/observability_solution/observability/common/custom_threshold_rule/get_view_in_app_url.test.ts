/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators } from './types';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { LogsExplorerLocatorParams } from '@kbn/deeplinks-observability';
import { getViewInAppUrl, GetViewInAppUrlArgs } from './get_view_in_app_url';

describe('getViewInAppUrl', () => {
  const logsExplorerLocator = {
    getRedirectUrl: jest.fn(() => 'mockedGetRedirectUrl'),
  } as unknown as LocatorPublic<LogsExplorerLocatorParams>;
  const startedAt = '2023-12-07T16:30:15.403Z';
  const endedAt = '2023-12-07T20:30:15.403Z';
  const returnedTimeRange = {
    // Duration 4 hour, time range will be extended it with 30 minutes from each side
    from: '2023-12-07T16:00:15.403Z',
    to: '2023-12-07T21:00:15.403Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should return empty string if logsExplorerLocator is not provided', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [],
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('');
  });

  it('should call getRedirectUrl with data view, time range and filters', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
      ],
      logsExplorerLocator,
      startedAt,
      endedAt,
      searchConfiguration: {
        index: {},
        query: {
          language: '',
          query: 'mockedFilter',
        },
      },
      dataViewId: 'mockedDataViewId',
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataset: args.dataViewId,
      timeRange: returnedTimeRange,
      filters: [],
      query: {
        query: 'mockedFilter and mockedCountFilter',
        language: 'kuery',
      },
    });
  });

  it('should call getRedirectUrl with only count filter', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
      ],
      logsExplorerLocator,
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataset: undefined,
      timeRange: returnedTimeRange,
      filters: [],
      query: {
        query: 'mockedCountFilter',
        language: 'kuery',
      },
    });
  });

  it('should call getRedirectUrl with only filter', () => {
    const args: GetViewInAppUrlArgs = {
      logsExplorerLocator,
      startedAt,
      endedAt,
      searchConfiguration: {
        index: {},
        query: {
          language: '',
          query: 'mockedFilter',
        },
      },
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataset: undefined,
      timeRange: returnedTimeRange,
      filters: [],
      query: {
        query: 'mockedFilter',
        language: 'kuery',
      },
    });
  });

  it('should call getRedirectUrl with empty query if metrics and filter are not not provided', () => {
    const args: GetViewInAppUrlArgs = {
      logsExplorerLocator,
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataset: undefined,
      timeRange: returnedTimeRange,
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    });
  });

  it('should call getRedirectUrl with empty if there are multiple metrics', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
        {
          name: 'A',
          aggType: Aggregators.AVERAGE,
          field: 'mockedAvgField',
        },
      ],
      logsExplorerLocator,
      startedAt,
      endedAt,
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataset: undefined,
      timeRange: returnedTimeRange,
      filters: [],
      query: {
        query: '',
        language: 'kuery',
      },
    });
  });

  it('should call getRedirectUrl with filters if group and searchConfiguration filter are provided', () => {
    const args: GetViewInAppUrlArgs = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          filter: 'mockedCountFilter',
        },
        {
          name: 'A',
          aggType: Aggregators.AVERAGE,
          field: 'mockedAvgField',
        },
      ],
      logsExplorerLocator,
      startedAt,
      endedAt,
      searchConfiguration: {
        index: {},
        query: {
          language: '',
          query: 'mockedFilter',
        },
        filter: [
          {
            meta: {},
            query: {
              term: {
                field: {
                  value: 'justTesting',
                },
              },
            },
          },
        ],
      },
      groups: [
        {
          field: 'host.name',
          value: 'host-1',
        },
      ],
    };

    expect(getViewInAppUrl(args)).toBe('mockedGetRedirectUrl');
    expect(logsExplorerLocator.getRedirectUrl).toHaveBeenCalledWith({
      dataset: undefined,
      timeRange: returnedTimeRange,
      filters: [
        {
          meta: {},
          query: {
            term: {
              field: {
                value: 'justTesting',
              },
            },
          },
        },
        {
          meta: {},
          query: {
            match_phrase: {
              'host.name': 'host-1',
            },
          },
        },
      ],
      query: {
        query: 'mockedFilter',
        language: 'kuery',
      },
    });
  });
});
