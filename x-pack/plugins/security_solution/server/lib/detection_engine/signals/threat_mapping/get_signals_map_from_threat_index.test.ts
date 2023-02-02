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

export const threatMock = {
  _id: 'threat-id-1',
  _index: 'threats-01',
  matched_queries: [namedQuery],
};

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

    const signalsMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsMap).toEqual(new Map());
  });

  it('should return signalsMap for signals if threats search results exhausted', async () => {
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

    const signalsMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsMap).toEqual(
      new Map([
        [
          'source-1',
          [
            {
              id: 'threat-id-1',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
            },
            {
              id: 'threat-id-2',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
            },
            {
              id: 'threat-id-3',
              index: 'threats-01',
              field: 'host.name',
              value: 'localhost-1',
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
            },
          ],
        ],
      ])
    );
  });
  it('should return signalsMap for signals if threats number reaches max of MAX_NUMBER_OF_SIGNAL_MATCHES', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: Array.from(Array(MAX_NUMBER_OF_SIGNAL_MATCHES + 1)).map(() => threatMock),
      },
    });

    const signalsMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams: threatSearchParamsMock,
      eventsCount: 50,
    });

    expect(signalsMap.get('source-1')).toHaveLength(MAX_NUMBER_OF_SIGNAL_MATCHES);
  });
});
