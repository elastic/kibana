/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { of, throwError } from 'rxjs';
import { act, renderHook } from '@testing-library/react-hooks';
import { useFetchAlerts, FetchAlertsArgs, FetchAlertResp } from './use_fetch_alerts';
import { useKibana } from '../../../../common/lib/kibana';
import { IKibanaSearchResponse } from '@kbn/data-plugin/public';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useState } from 'react';

jest.mock('../../../../common/lib/kibana');

const searchResponse = {
  id: '0',
  rawResponse: {
    took: 1,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 2,
      max_score: 1,
      hits: [
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
          _score: 1,
          fields: {
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            '@timestamp': ['2022-03-22T16:48:07.518Z'],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'user.name': ['5qcxz8o4j7'],
            'kibana.alert.reason': [
              'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
            ],
            'host.name': ['Host-4dbzugdlqd'],
          },
        },
        {
          _index: '.internal.alerts-security.alerts-default-000001',
          _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
          _score: 1,
          fields: {
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            '@timestamp': ['2022-03-22T16:17:50.769Z'],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'user.name': ['hdgsmwj08h'],
            'kibana.alert.reason': [
              'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
            ],
            'host.name': ['Host-4dbzugdlqd'],
          },
        },
      ],
    },
  },
  isPartial: false,
  isRunning: false,
  total: 2,
  loaded: 2,
  isRestored: false,
};

const searchResponse$ = of<IKibanaSearchResponse>(searchResponse);

const expectedResponse: FetchAlertResp = {
  alerts: [],
  getInspectQuery: expect.anything(),
  refetch: expect.anything(),
  isInitializing: true,
  totalAlerts: -1,
  oldAlertsData: [],
  ecsAlertsData: [],
};

describe('useFetchAlerts', () => {
  let clock: sinon.SinonFakeTimers;
  const onPageChangeMock = jest.fn();
  const args: FetchAlertsArgs = {
    featureIds: ['siem'],
    fields: [
      { field: 'kibana.rule.type.id', include_unmapped: true },
      { field: '*', include_unmapped: true },
    ],
    query: {
      ids: { values: ['alert-id-1'] },
    },
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },
    onPageChange: onPageChangeMock,
    sort: [],
    skip: false,
  };

  const dataSearchMock = useKibana().services.data.search.search as jest.Mock;
  const showErrorMock = useKibana().services.data.search.showError as jest.Mock;
  dataSearchMock.mockReturnValue(searchResponse$);

  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clock.reset();
  });

  afterAll(() => clock.restore());

  it('returns the response correctly', () => {
    const { result } = renderHook(() => useFetchAlerts(args));
    expect(result.current).toEqual([
      false,
      {
        ...expectedResponse,
        alerts: [
          {
            _index: '.internal.alerts-security.alerts-default-000001',
            _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
            '@timestamp': ['2022-03-22T16:48:07.518Z'],
            'host.name': ['Host-4dbzugdlqd'],
            'kibana.alert.reason': [
              'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
            ],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            'user.name': ['5qcxz8o4j7'],
          },
          {
            _index: '.internal.alerts-security.alerts-default-000001',
            _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
            '@timestamp': ['2022-03-22T16:17:50.769Z'],
            'host.name': ['Host-4dbzugdlqd'],
            'kibana.alert.reason': [
              'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
            ],
            'kibana.alert.risk_score': [21],
            'kibana.alert.rule.name': ['test'],
            'kibana.alert.severity': ['low'],
            'process.name': ['iexlorer.exe'],
            'user.name': ['hdgsmwj08h'],
          },
        ],
        totalAlerts: 2,
        isInitializing: false,
        getInspectQuery: expect.anything(),
        refetch: expect.anything(),
        ecsAlertsData: [
          {
            kibana: {
              alert: {
                severity: ['low'],
                risk_score: [21],
                rule: { name: ['test'] },
                reason: [
                  'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
                ],
              },
            },
            process: { name: ['iexlorer.exe'] },
            '@timestamp': ['2022-03-22T16:48:07.518Z'],
            user: { name: ['5qcxz8o4j7'] },
            host: { name: ['Host-4dbzugdlqd'] },
            _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
            _index: '.internal.alerts-security.alerts-default-000001',
          },
          {
            kibana: {
              alert: {
                severity: ['low'],
                risk_score: [21],
                rule: { name: ['test'] },
                reason: [
                  'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
                ],
              },
            },
            process: { name: ['iexlorer.exe'] },
            '@timestamp': ['2022-03-22T16:17:50.769Z'],
            user: { name: ['hdgsmwj08h'] },
            host: { name: ['Host-4dbzugdlqd'] },
            _id: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
            _index: '.internal.alerts-security.alerts-default-000001',
          },
        ],
        oldAlertsData: [
          [
            { field: 'kibana.alert.severity', value: ['low'] },
            { field: 'process.name', value: ['iexlorer.exe'] },
            { field: '@timestamp', value: ['2022-03-22T16:48:07.518Z'] },
            { field: 'kibana.alert.risk_score', value: [21] },
            { field: 'kibana.alert.rule.name', value: ['test'] },
            { field: 'user.name', value: ['5qcxz8o4j7'] },
            {
              field: 'kibana.alert.reason',
              value: [
                'registry event with process iexlorer.exe, by 5qcxz8o4j7 on Host-4dbzugdlqd created low alert test.',
              ],
            },
            { field: 'host.name', value: ['Host-4dbzugdlqd'] },
            {
              field: '_id',
              value: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
            },
            { field: '_index', value: '.internal.alerts-security.alerts-default-000001' },
          ],
          [
            { field: 'kibana.alert.severity', value: ['low'] },
            { field: 'process.name', value: ['iexlorer.exe'] },
            { field: '@timestamp', value: ['2022-03-22T16:17:50.769Z'] },
            { field: 'kibana.alert.risk_score', value: [21] },
            { field: 'kibana.alert.rule.name', value: ['test'] },
            { field: 'user.name', value: ['hdgsmwj08h'] },
            {
              field: 'kibana.alert.reason',
              value: [
                'network event with process iexlorer.exe, by hdgsmwj08h on Host-4dbzugdlqd created low alert test.',
              ],
            },
            { field: 'host.name', value: ['Host-4dbzugdlqd'] },
            {
              field: '_id',
              value: '8361363c0db6f30ca2dfb4aeb4835e7d6ec57bc195b96d9ee5a4ead1bb9f8b86',
            },
            { field: '_index', value: '.internal.alerts-security.alerts-default-000001' },
          ],
        ],
      },
    ]);
  });

  it('call search with correct arguments', () => {
    renderHook(() => useFetchAlerts(args));
    expect(dataSearchMock).toHaveBeenCalledTimes(1);
    expect(dataSearchMock).toHaveBeenCalledWith(
      {
        featureIds: args.featureIds,
        fields: [...args.fields],
        pagination: args.pagination,
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        sort: args.sort,
      },
      { abortSignal: expect.anything(), strategy: 'privateRuleRegistryAlertsSearchStrategy' }
    );
  });

  it('skips the fetch correctly', () => {
    const { result } = renderHook(() => useFetchAlerts({ ...args, skip: true }));

    expect(dataSearchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual([
      false,
      {
        ...expectedResponse,
        alerts: [],
        getInspectQuery: expect.anything(),
        refetch: expect.anything(),
        isInitializing: true,
        totalAlerts: -1,
      },
    ]);
  });

  it('handles search error', () => {
    const obs$ = throwError('simulated search error');
    dataSearchMock.mockReturnValue(obs$);
    const { result } = renderHook(() => useFetchAlerts(args));

    expect(result.current).toEqual([
      false,
      {
        ...expectedResponse,
        alerts: [],
        getInspectQuery: expect.anything(),
        refetch: expect.anything(),
        isInitializing: true,
        totalAlerts: -1,
      },
    ]);

    expect(showErrorMock).toHaveBeenCalled();
  });

  it('returns the correct response if the search response is running', () => {
    const obs$ = of<IKibanaSearchResponse>({ ...searchResponse, isRunning: true });
    dataSearchMock.mockReturnValue(obs$);
    const { result } = renderHook(() => useFetchAlerts(args));

    expect(result.current).toEqual([
      true,
      {
        ...expectedResponse,
        alerts: [],
        getInspectQuery: expect.anything(),
        refetch: expect.anything(),
        isInitializing: true,
        totalAlerts: -1,
      },
    ]);
  });

  it('returns the correct total alerts if the total alerts in the response is an object', () => {
    const obs$ = of<IKibanaSearchResponse>({
      ...searchResponse,
      rawResponse: {
        ...searchResponse.rawResponse,
        hits: { ...searchResponse.rawResponse.hits, total: { value: 2 } },
      },
    });

    dataSearchMock.mockReturnValue(obs$);
    const { result } = renderHook(() => useFetchAlerts(args));
    const [_, alerts] = result.current;

    expect(alerts.totalAlerts).toEqual(2);
  });

  it('does not return an alert without fields', () => {
    const obs$ = of<IKibanaSearchResponse>({
      ...searchResponse,
      rawResponse: {
        ...searchResponse.rawResponse,
        hits: {
          ...searchResponse.rawResponse.hits,
          hits: [
            {
              _index: '.internal.alerts-security.alerts-default-000001',
              _id: '38dd308706a127696cc63b8f142e8e4d66f8f79bc7d491dd79a42ea4ead62dd1',
              _score: 1,
            },
          ],
        },
      },
    });

    dataSearchMock.mockReturnValue(obs$);
    const { result } = renderHook(() => useFetchAlerts(args));
    const [_, alerts] = result.current;

    expect(alerts.alerts).toEqual([]);
  });

  it('resets pagination on refetch correctly', async () => {
    const { result } = renderHook(() =>
      useFetchAlerts({
        ...args,
        pagination: {
          pageIndex: 5,
          pageSize: 10,
        },
      })
    );
    const [_, alerts] = result.current;
    expect(dataSearchMock).toHaveBeenCalledWith(
      {
        featureIds: args.featureIds,
        fields: [...args.fields],
        pagination: {
          pageIndex: 5,
          pageSize: 10,
        },
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        sort: args.sort,
      },
      { abortSignal: expect.anything(), strategy: 'privateRuleRegistryAlertsSearchStrategy' }
    );

    await act(async () => {
      alerts.refetch();
    });

    expect(dataSearchMock).toHaveBeenCalledWith(
      {
        featureIds: args.featureIds,
        fields: [...args.fields],
        pagination: {
          pageIndex: 0,
          pageSize: 10,
        },
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        sort: args.sort,
      },
      { abortSignal: expect.anything(), strategy: 'privateRuleRegistryAlertsSearchStrategy' }
    );
  });

  it('does not fetch with no feature ids', () => {
    const { result } = renderHook(() => useFetchAlerts({ ...args, featureIds: [] }));

    expect(dataSearchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual([
      false,
      {
        ...expectedResponse,
        alerts: [],
        getInspectQuery: expect.anything(),
        refetch: expect.anything(),
        isInitializing: true,
        totalAlerts: -1,
      },
    ]);
  });

  it('reset pagination when query is used', async () => {
    const useWrapperHook = ({ query }: { query: Pick<QueryDslQueryContainer, 'bool' | 'ids'> }) => {
      const [pagination, setPagination] = useState({ pageIndex: 5, pageSize: 10 });
      const handlePagination = (newPagination: { pageIndex: number; pageSize: number }) => {
        onPageChangeMock(newPagination);
        setPagination(newPagination);
      };
      const result = useFetchAlerts({
        ...args,
        pagination,
        onPageChange: handlePagination,
        query,
      });
      return result;
    };

    const { rerender } = renderHook(
      ({ initialValue }) =>
        useWrapperHook({
          query: initialValue,
        }),
      {
        initialProps: { initialValue: {} },
      }
    );

    expect(dataSearchMock).lastCalledWith(
      {
        featureIds: args.featureIds,
        fields: [...args.fields],
        pagination: {
          pageIndex: 5,
          pageSize: 10,
        },
        query: {},
        sort: args.sort,
      },
      { abortSignal: expect.anything(), strategy: 'privateRuleRegistryAlertsSearchStrategy' }
    );

    rerender({
      initialValue: {
        ids: {
          values: ['alert-id-1'],
        },
      },
    });

    expect(dataSearchMock).lastCalledWith(
      {
        featureIds: args.featureIds,
        fields: [...args.fields],
        pagination: {
          pageIndex: 0,
          pageSize: 10,
        },
        query: {
          ids: {
            values: ['alert-id-1'],
          },
        },
        sort: args.sort,
      },
      { abortSignal: expect.anything(), strategy: 'privateRuleRegistryAlertsSearchStrategy' }
    );
    expect(onPageChangeMock).lastCalledWith({
      pageIndex: 0,
      pageSize: 10,
    });
  });
});
