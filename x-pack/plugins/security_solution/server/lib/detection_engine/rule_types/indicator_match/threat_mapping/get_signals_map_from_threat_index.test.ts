/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreatMatchQueryType } from './types';

import { getSignalsQueryMapFromThreatIndex } from './get_signals_map_from_threat_index';
import { getThreatList } from './get_threat_list';
import { encodeThreatMatchNamedQuery } from './utils';
import { MAX_NUMBER_OF_SIGNAL_MATCHES } from './enrich_signal_threat_matches';

import { threatSearchParamsMock } from './get_signals_map_from_threat_index.mock';

jest.mock('./get_threat_list', () => ({ getThreatList: jest.fn() }));

const getThreatListMock = getThreatList as jest.Mock;

export const namedQuery = encodeThreatMatchNamedQuery({
  id: 'source-1',
  index: 'source-*',
  field: 'host.name',
  value: 'localhost-1',
  queryType: ThreatMatchQueryType.match,
});

const termsNamedQuery = encodeThreatMatchNamedQuery({
  value: 'threat.indicator.domain',
  field: 'event.domain',
  queryType: ThreatMatchQueryType.term,
});

export const threatMock = {
  _id: 'threat-id-1',
  _index: 'threats-01',
  matched_queries: [namedQuery],
};

const termsThreatMock = {
  _id: 'threat-id-1',
  _index: 'threats-01',
  matched_queries: [termsNamedQuery],
};

getThreatListMock.mockReturnValue({ hits: { hits: [] } });

describe('getSignalsQueryMapFromThreatIndex', () => {
  it('should call getThreatList to fetch threats from ES', async () => {
    getThreatListMock.mockReturnValue({ hits: { hits: [] } });

    await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(getThreatListMock).toHaveBeenCalledTimes(1);
    expect(getThreatListMock).toHaveBeenCalledWith(threatSearchParamsMock);
  });

  it('should return empty signals map if getThreatList return empty results', async () => {
    getThreatListMock.mockReturnValue({ hits: { hits: [] } });

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsQueryMap).toEqual(new Map());
  });

  it('should return signalsQueryMap for signals if threats search results exhausted', async () => {
    const namedQuery2 = encodeThreatMatchNamedQuery({
      id: 'source-2',
      index: 'source-*',
      field: 'host.name',
      value: 'localhost-1',
      queryType: ThreatMatchQueryType.match,
    });

    // the third request return empty results
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [threatMock],
      },
    });
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [
          { ...threatMock, _id: 'threat-id-2', matched_queries: [namedQuery, namedQuery2] },
          { ...threatMock, _id: 'threat-id-3' },
        ],
      },
    });
    getThreatListMock.mockReturnValueOnce({ hits: { hits: [] } });

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsQueryMap).toEqual(
      new Map([
        [
          'source-1',
          [
            {
              id: 'threat-id-1',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
              queryType: ThreatMatchQueryType.match,
            },
            {
              id: 'threat-id-2',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
              queryType: ThreatMatchQueryType.match,
            },
            {
              id: 'threat-id-3',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
              queryType: ThreatMatchQueryType.match,
            },
          ],
        ],
        [
          'source-2',
          [
            {
              id: 'threat-id-2',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
              queryType: ThreatMatchQueryType.match,
            },
          ],
        ],
      ])
    );
  });
  it('should return signalsQueryMap for signals if threats number reaches max of MAX_NUMBER_OF_SIGNAL_MATCHES', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: Array.from(Array(MAX_NUMBER_OF_SIGNAL_MATCHES + 1)).map(() => threatMock),
      },
    });

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsQueryMap.get('source-1')).toHaveLength(MAX_NUMBER_OF_SIGNAL_MATCHES);
  });

  it('should return empty signalsQueryMap for terms query if there no signalValueMap', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [termsThreatMock],
      },
    });

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsQueryMap).toEqual(new Map());
  });

  it('should return empty signalsQueryMap for terms query if there wrong value in threat indicator', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [
          {
            ...termsThreatMock,
            _source: {
              threat: {
                indicator: {
                  domain: { a: 'b' },
                },
              },
            },
          },
        ],
      },
    });

    const signalValueMap = {
      'event.domain': {
        domain_1: ['signalId1', 'signalId2'],
      },
    };

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
      signalValueMap,
    });

    expect(signalsQueryMap).toEqual(new Map());
  });

  it('should return signalsQueryMap from threat indicators for termsQuery', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [
          {
            ...termsThreatMock,
            _source: {
              threat: {
                indicator: {
                  domain: 'domain_1',
                },
              },
            },
          },
        ],
      },
    });

    const signalValueMap = {
      'event.domain': {
        domain_1: ['signalId1', 'signalId2'],
      },
    };

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
      signalValueMap,
    });

    const queries = [
      {
        field: 'event.domain',
        value: 'threat.indicator.domain',
        id: 'threat-id-1',
        index: 'threats-01',
        queryType: ThreatMatchQueryType.term,
      },
    ];

    expect(signalsQueryMap).toEqual(
      new Map([
        ['signalId1', queries],
        ['signalId2', queries],
      ])
    );
  });

  it('should return signalsQueryMap from threat indicators which has array values for termsQuery', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [
          {
            ...termsThreatMock,
            _source: {
              threat: {
                indicator: {
                  domain: ['domain_3', 'domain_1', 'domain_2'],
                },
              },
            },
          },
        ],
      },
    });

    const signalValueMap = {
      'event.domain': {
        domain_1: ['signalId1'],
        domain_2: ['signalId2'],
      },
    };

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
      signalValueMap,
    });

    const queries = [
      {
        field: 'event.domain',
        value: 'threat.indicator.domain',
        id: 'threat-id-1',
        index: 'threats-01',
        queryType: ThreatMatchQueryType.term,
      },
    ];

    expect(signalsQueryMap).toEqual(
      new Map([
        ['signalId1', queries],
        ['signalId2', queries],
      ])
    );
  });
});
