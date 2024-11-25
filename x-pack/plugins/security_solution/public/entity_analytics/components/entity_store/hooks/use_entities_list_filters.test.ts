/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useEntitiesListFilters } from './use_entities_list_filters';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { CriticalityLevels } from '../../../../../common/constants';
import { RiskSeverity } from '../../../../../common/search_strategy';
import { EntitySourceTag } from '../types';

jest.mock('../../../../common/hooks/use_global_filter_query');

describe('useEntitiesListFilters', () => {
  const mockUseGlobalFilterQuery = useGlobalFilterQuery as jest.Mock;

  beforeEach(() => {
    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: null });
  });

  it('should return empty filter when no filters are selected', () => {
    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [],
        selectedCriticalities: [],
        selectedSources: [],
      })
    );

    expect(result.current).toEqual([]);
  });

  it('should return severity filters when severities are selected', () => {
    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [RiskSeverity.Low, RiskSeverity.High],
        selectedCriticalities: [],
        selectedSources: [],
      })
    );

    const expectedFilters: QueryDslQueryContainer[] = [
      {
        bool: {
          should: [
            { term: { 'host.risk.calculated_level': RiskSeverity.Low } },
            { term: { 'user.risk.calculated_level': RiskSeverity.Low } },
            { term: { 'host.risk.calculated_level': RiskSeverity.High } },
            { term: { 'user.risk.calculated_level': RiskSeverity.High } },
          ],
        },
      },
    ];

    expect(result.current).toEqual(expectedFilters);
  });

  it('should return criticality filters when criticalities are selected', () => {
    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [],
        selectedCriticalities: [CriticalityLevels.EXTREME_IMPACT, CriticalityLevels.MEDIUM_IMPACT],
        selectedSources: [],
      })
    );

    const expectedFilters: QueryDslQueryContainer[] = [
      {
        bool: {
          should: [
            {
              term: {
                'asset.criticality': CriticalityLevels.EXTREME_IMPACT,
              },
            },
            {
              term: {
                'asset.criticality': CriticalityLevels.MEDIUM_IMPACT,
              },
            },
          ],
        },
      },
    ];

    expect(result.current).toEqual(expectedFilters);
  });

  it('should return source filters when sources are selected', () => {
    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [],
        selectedCriticalities: [],
        selectedSources: [EntitySourceTag.criticality, EntitySourceTag.risk],
      })
    );

    const expectedFilters: QueryDslQueryContainer[] = [
      {
        bool: {
          should: [
            { wildcard: { 'entity.source': '.asset-criticality.asset-criticality-*' } },
            { wildcard: { 'entity.source': 'risk-score.risk-score-*' } },
          ],
        },
      },
    ];

    expect(result.current).toEqual(expectedFilters);
  });

  it('should return source events filters when events is selected', () => {
    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [],
        selectedCriticalities: [],
        selectedSources: [EntitySourceTag.events],
      })
    );

    const expectedFilters: QueryDslQueryContainer[] = [
      {
        bool: {
          should: [
            {
              bool: {
                must_not: [
                  { wildcard: { 'entity.source': '.asset-criticality.asset-criticality-*' } },
                  { wildcard: { 'entity.source': 'risk-score.risk-score-*' } },
                ],
              },
            },
          ],
        },
      },
    ];

    expect(result.current).toEqual(expectedFilters);
  });

  it('should include global query if it exists', () => {
    const globalQuery: QueryDslQueryContainer = { term: { 'global.field': 'value' } };
    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: globalQuery });

    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [],
        selectedCriticalities: [],
        selectedSources: [],
      })
    );

    expect(result.current).toEqual([globalQuery]);
  });

  it('should combine all filters', () => {
    const globalQuery: QueryDslQueryContainer = { term: { 'global.field': 'value' } };
    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: globalQuery });

    const { result } = renderHook(() =>
      useEntitiesListFilters({
        selectedSeverities: [RiskSeverity.Low],
        selectedCriticalities: [CriticalityLevels.HIGH_IMPACT],
        selectedSources: [EntitySourceTag.risk],
      })
    );

    const expectedFilters: QueryDslQueryContainer[] = [
      {
        bool: {
          should: [
            { term: { 'host.risk.calculated_level': RiskSeverity.Low } },
            { term: { 'user.risk.calculated_level': RiskSeverity.Low } },
          ],
        },
      },
      {
        bool: {
          should: [{ term: { 'asset.criticality': CriticalityLevels.HIGH_IMPACT } }],
        },
      },
      {
        bool: {
          should: [{ wildcard: { 'entity.source': 'risk-score.risk-score-*' } }],
        },
      },
      globalQuery,
    ];

    expect(result.current).toEqual(expectedFilters);
  });
});
