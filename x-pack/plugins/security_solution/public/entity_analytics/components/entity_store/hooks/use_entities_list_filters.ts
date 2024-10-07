/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { useMemo } from 'react';
import type { CriticalityLevels } from '../../../../../common/constants';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { useGlobalFilterQuery } from '../../../../common/hooks/use_global_filter_query';
import type { EntitySource } from '../components/entity_source_filter';

interface UseEntitiesListFiltersParams {
  selectedSeverities: RiskSeverity[];
  selectedCriticalities: CriticalityLevels[];
  selectedSources: EntitySource[];
}

export const useEntitiesListFilters = ({
  selectedSeverities,
  selectedCriticalities,
  selectedSources,
}: UseEntitiesListFiltersParams) => {
  const { filterQuery: globalQuery } = useGlobalFilterQuery();

  return useMemo(() => {
    const criticalityFilter: QueryDslQueryContainer[] = selectedCriticalities.map((value) => ({
      term: {
        'asset.criticality': value,
      },
    }));

    const sourceFilter: QueryDslQueryContainer[] = selectedSources.map((value) => ({
      term: {
        'entity.source': value,
      },
    }));

    const severityFilter: QueryDslQueryContainer[] = selectedSeverities.map((value) => ({
      bool: {
        should: [
          {
            term: {
              'host.risk.calculated_level': value,
            },
          },
          {
            term: {
              'user.risk.calculated_level': value,
            },
          },
        ],
        minimum_should_match: 1,
      },
    }));

    const filterList: QueryDslQueryContainer[] = [
      ...severityFilter,
      ...criticalityFilter,
      ...sourceFilter,
    ];
    if (globalQuery) {
      filterList.push(globalQuery);
    }
    return filterList;
  }, [globalQuery, selectedCriticalities, selectedSeverities, selectedSources]);
};
