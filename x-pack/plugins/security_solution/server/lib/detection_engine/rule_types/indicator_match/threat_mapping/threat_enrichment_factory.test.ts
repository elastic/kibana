/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalSourceHit } from '../../types';
import { enrichSignalThreatMatchesFromSignalsMap } from './enrich_signal_threat_matches';
import { getNamedQueryMock } from './enrich_signal_threat_matches.mock';
import { threatSearchParamsMock } from './get_signals_map_from_threat_index.mock';
import { getThreatList } from './get_threat_list';
import { threatEnrichmentFactory } from './threat_enrichment_factory';

jest.mock('./get_threat_list', () => ({ getThreatList: jest.fn() }));
jest.mock('./enrich_signal_threat_matches', () => ({
  enrichSignalThreatMatchesFromSignalsMap: jest.fn(),
}));

const getThreatListMock = getThreatList as jest.Mock;
const enrichSignalThreatMatchesFromSignalsMapMock =
  enrichSignalThreatMatchesFromSignalsMap as jest.Mock;

const signals = [
  {
    _id: 'source-id-1',
  },
  {
    _id: 'source-id-2',
  },
];

const signalsMapMock = new Map([
  ['source-id-1', [getNamedQueryMock({ id: 'threat-1' }), getNamedQueryMock({ id: 'threat-2' })]],
  // this signal's threats not present in signalsMap, so will be ignored in threatFilter
  ['source-id-3', [getNamedQueryMock({ id: 'threat-x' }), getNamedQueryMock({ id: 'threat-y' })]],
]);

getThreatListMock.mockReturnValue({ hits: { hits: [] } });
enrichSignalThreatMatchesFromSignalsMapMock.mockImplementation((_, getThreats) => getThreats());

describe('threatEnrichmentFactory', () => {
  it('enrichment should call enrichSignalThreatMatchesFromSignalsMap with correct params', async () => {
    const enrichment = threatEnrichmentFactory({
      signalsQueryMap: signalsMapMock,
      threatIndicatorPath: 'indicator.mock',
      threatFilters: ['mock-threat-filters'],
      threatSearchParams: threatSearchParamsMock,
    });

    await enrichment(signals as SignalSourceHit[]);

    expect(enrichSignalThreatMatchesFromSignalsMap).toHaveBeenCalledWith(
      signals,
      expect.any(Function),
      'indicator.mock',
      signalsMapMock
    );
  });

  it('enrichment should call getThreatList with matched threat ids filters in signalsMap', async () => {
    const enrichment = threatEnrichmentFactory({
      signalsQueryMap: signalsMapMock,
      threatIndicatorPath: 'indicator.mock',
      threatFilters: ['mock-threat-filters'],
      threatSearchParams: threatSearchParamsMock,
    });

    await enrichment(signals as SignalSourceHit[]);

    expect(getThreatListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        threatFilters: [
          'mock-threat-filters',
          {
            query: {
              bool: {
                filter: {
                  ids: { values: ['threat-1', 'threat-2'] },
                },
              },
            },
          },
        ],
      })
    );
  });

  it('enrichment should call getThreatList with correct threatListConfig', async () => {
    const enrichment = threatEnrichmentFactory({
      signalsQueryMap: new Map(),
      threatIndicatorPath: 'indicator.mock',
      threatFilters: ['mock-threat-filters'],
      threatSearchParams: threatSearchParamsMock,
    });

    await enrichment(signals as SignalSourceHit[]);

    expect(getThreatListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        threatListConfig: {
          _source: ['indicator.mock.*', 'threat.feed.*'],
          fields: undefined,
        },
      })
    );
  });
});
