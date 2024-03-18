/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { FETCH_STATUS, useFetcher } from '@kbn/observability-shared-plugin/public';
import { useGetDataStreamStatuses } from './use_get_data_stream_statuses';
import { policyLabels } from '../data_retention/policy_labels';
import { DataStream } from '@kbn/index-management-plugin/common';

jest.mock('@kbn/observability-shared-plugin/public', () => ({
  ...jest.requireActual('@kbn/observability-shared-plugin/public'),
  useFetcher: jest.fn(),
}));

jest.mock('./api', () => ({
  getDslPolicies: jest.fn(),
}));

describe('useGetDataStreamStatuses', () => {
  it('filters and formats the data returned by the data streams API', () => {
    (useFetcher as jest.Mock).mockImplementation((callback) => {
      callback();
      return {
        error: undefined,
        loading: false,
        status: FETCH_STATUS.SUCCESS,
        refetch: () => {},
        fetch: jest.fn(),
        data: exampleData,
      };
    });

    const {
      result: {
        current: { dataStreamStatuses, error, loading },
      },
    } = renderHook(() => useGetDataStreamStatuses());

    expect(dataStreamStatuses).not.toBeNull();
    expect(Array.isArray(dataStreamStatuses)).toBe(true);
    expect(dataStreamStatuses).toHaveLength(policyLabels.length);
    expect(error).toBeUndefined();
    expect(loading).toBe(false);
    const dataStreamSummary = dataStreamStatuses?.find((d) => d.name === 'All Checks');
    expect(dataStreamSummary).not.toBeUndefined();
    // check special cases for summary row
    expect(dataStreamSummary?.storageSize).toEqual('18 MB');
    expect(dataStreamSummary?.lifecycle?.data_retention).toEqual('--');
  });

  it('returns a undefined set for no data', () => {
    (useFetcher as jest.Mock).mockImplementation((callback) => {
      callback();
      return {
        error: undefined,
        loading: false,
        status: FETCH_STATUS.SUCCESS,
        refetch: () => {},
        fetch: jest.fn(),
        data: undefined,
      };
    });
    const {
      result: {
        current: { dataStreamStatuses, loading },
      },
    } = renderHook(() => useGetDataStreamStatuses());
    expect(dataStreamStatuses).toBeUndefined();
    expect(loading).toBe(false);
  });

  it('returns a undefined set for error', () => {
    (useFetcher as jest.Mock).mockImplementation((callback) => {
      callback();
      return {
        error: new Error('A sample error message'),
        loading: false,
        status: 'success' as FETCH_STATUS.SUCCESS,
        refetch: () => {},
        fetch: jest.fn(),
        data: undefined,
      };
    });
    const {
      result: {
        current: { dataStreamStatuses, loading, error },
      },
    } = renderHook(() => useGetDataStreamStatuses());
    expect(dataStreamStatuses).toBeUndefined();
    expect(error).toEqual(new Error('A sample error message'));
    expect(loading).toBe(false);
  });
});

function testData(overrides: Partial<DataStream>) {
  return {
    name: 'test',
    timeStampField: {
      name: '@timestamp',
    },
    indices: [
      {
        name: 'test',
        uuid: 'test',
        preferILM: true,
        managedBy: 'Data stream lifecycle',
      },
    ],
    generation: 1,
    health: 'green',
    indexTemplateName: 'test',
    storageSize: '564b',
    storageSizeBytes: 564,
    maxTimeStamp: 0,
    _meta: {
      namespace: 'default',
      kibana: {
        version: '8.13.0',
      },
      managed: true,
    },
    privileges: {
      delete_index: true,
      manage_data_stream_lifecycle: true,
    },
    hidden: true,
    lifecycle: {
      enabled: true,
    },
    nextGenerationManagedBy: 'Data stream lifecycle',
    ...overrides,
  };
}

const exampleData = [
  testData({
    name: '.alerts-default.alerts-default',
    indexTemplateName: '.alerts-default.alerts-default-index-template',
  }),
  testData({
    name: '.alerts-ml.anomaly-detection-health.alerts-default',
    indexTemplateName: '.alerts-ml.anomaly-detection-health.alerts-default-index-template',
  }),
  testData({
    name: 'synthetics-browser-default',
    indexTemplateName: 'synthetics-browser',
    indices: [
      {
        name: '.ds-synthetics-browser-default-2024.01.04-000008',
        uuid: '7KCI2rQOSfumKmT93_leDw',
        preferILM: true,
        managedBy: 'Data stream lifecycle',
      },
      {
        name: '.ds-synthetics-browser-default-2024.01.17-000011',
        uuid: 'fmJwJiFzS4ue06JHdklVmA',
        preferILM: true,
        managedBy: 'Data stream lifecycle',
      },
      {
        name: '.ds-synthetics-browser-default-2024.01.29-000012',
        uuid: 'mR-EKznRSxSuGNYq0ZltMA',
        preferILM: true,
        managedBy: 'Data stream lifecycle',
      },
      {
        name: '.ds-synthetics-browser-default-2024.03.06-000014',
        uuid: 'YeE2r1wjSwi7PCnMBmmYoA',
        preferILM: true,
        managedBy: 'Data stream lifecycle',
      },
    ],
    lifecycle: {
      enabled: true,
      data_retention: '365d',
    },
    storageSize: '18.3mb',
    storageSizeBytes: 19265414,
    maxTimeStamp: 1709752759520,
  }),
  testData({
    name: 'synthetics-browser.network-default',

    indexTemplateName: 'synthetics-browser.network',
  }),
  testData({
    name: 'synthetics-browser.screenshot-default',
    indexTemplateName: 'synthetics-browser.screenshot',
  }),
  testData({
    name: 'synthetics-http-default',
    indexTemplateName: 'synthetics-http',
  }),
];
