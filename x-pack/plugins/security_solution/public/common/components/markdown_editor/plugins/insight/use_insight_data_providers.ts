/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { FILTERS, BooleanRelation, FilterStateStore } from '@kbn/es-query';
import type { QueryOperator, DataProvider } from '@kbn/timelines-plugin/common';
import { DataProviderType } from '../../../../../../common/api/timeline';
import { replaceParamsQuery } from './replace_params_query';
import type { TimelineEventsDetailsItem } from '../../../../../../common/search_strategy';
import {
  EXISTS_OPERATOR,
  IS_OPERATOR,
  IS_ONE_OF_OPERATOR,
} from '../../../../../timelines/components/timeline/data_providers/data_provider';

export interface Provider {
  field: string;
  excluded: boolean;
  queryType: string;
  value: string | number | boolean;
  valueType?: string;
}
export interface UseInsightDataProvidersProps {
  providers: Provider[][];
  alertData?: TimelineEventsDetailsItem[] | null;
}

export interface UseInsightDataProvidersResult {
  dataProviders: DataProvider[];
  filters: Filter[];
}

const dataProviderQueryType = (type: string): QueryOperator => {
  if (type === FILTERS.EXISTS) {
    return EXISTS_OPERATOR;
  } else if (type === FILTERS.PHRASES) {
    return IS_ONE_OF_OPERATOR;
  } else {
    return IS_OPERATOR;
  }
};

const filterStub = {
  $state: {
    store: FilterStateStore.APP_STATE,
  },
  meta: {
    disabled: false,
    negate: false,
    alias: null,
    index: undefined,
  },
};

const dataProviderStub: DataProvider = {
  and: [],
  enabled: true,
  id: '',
  name: '',
  excluded: false,
  kqlQuery: '',
  type: DataProviderType.default,
  queryMatch: {
    field: '',
    value: '',
    operator: EXISTS_OPERATOR,
  },
};
const buildDataProviders = (
  providers: Provider[][],
  alertData?: TimelineEventsDetailsItem[] | null
): DataProvider[] => {
  return providers.map((innerProvider) => {
    return innerProvider.reduce((prev, next, index): DataProvider => {
      const { field, value, excluded, queryType } = next;
      const { result, matchedBrackets } = replaceParamsQuery(value, alertData);
      const isTemplate = !alertData && matchedBrackets;
      if (index === 0) {
        return {
          and: [],
          enabled: true,
          id: JSON.stringify(field + value),
          name: field,
          excluded,
          kqlQuery: '',
          type: isTemplate ? DataProviderType.template : DataProviderType.default,
          queryMatch: {
            field,
            value: result,
            operator: dataProviderQueryType(queryType),
          },
        };
      } else {
        const newProvider = {
          enabled: true,
          id: JSON.stringify(field + value),
          name: field,
          excluded,
          kqlQuery: '',
          type: isTemplate ? DataProviderType.template : DataProviderType.default,
          queryMatch: {
            field,
            value: result,
            operator: dataProviderQueryType(queryType),
          },
        };
        prev.and.push(newProvider);
      }
      return prev;
    }, dataProviderStub);
  });
};

const buildPrimitiveFilter = (provider: Provider): Filter => {
  const baseFilter = {
    ...filterStub,
    meta: {
      ...filterStub.meta,
      negate: provider.excluded,
      type: provider.queryType,
    },
  };
  if (provider.queryType === FILTERS.EXISTS) {
    return {
      ...baseFilter,
      meta: {
        ...baseFilter.meta,
        params: undefined,
        value: 'exists',
      },
      query: { exists: { field: provider.field } },
    };
  } else if (provider.queryType === FILTERS.PHRASES) {
    let values = JSON.parse(String(provider.value));
    if (provider.valueType === 'number') {
      values = values.map(Number);
    } else if (provider.valueType === 'boolean') {
      values = values.map(Boolean);
    }
    return {
      ...baseFilter,
      meta: {
        ...baseFilter.meta,
      },
      query: {
        bool: {
          minimum_should_match: 1,
          should: values?.map((param: string | number | boolean) => ({
            match_phrase: { [provider.field]: param },
          })),
        },
      },
    };
  } else if (provider.queryType === FILTERS.PHRASE) {
    return {
      ...baseFilter,
      meta: {
        ...baseFilter.meta,
        params: { query: provider.value },
        value: undefined,
      },
      query: { match_phrase: { [provider.field]: provider.value ?? '' } },
    };
  } else if (provider.queryType === FILTERS.RANGE) {
    let gte;
    let lt;
    try {
      const input = JSON.parse(String(provider.value));
      gte = input.gte;
      lt = input.lt;
    } catch {
      gte = '';
      lt = '';
    }
    const params = {
      gte,
      lt,
    };
    return {
      ...baseFilter,
      meta: {
        ...baseFilter.meta,
        params,
      },
      query: {
        range: {
          [provider.field]: params,
        },
      },
    };
  } else {
    return baseFilter;
  }
};

const buildFiltersFromInsightProviders = (
  providers: Provider[][],
  alertData?: TimelineEventsDetailsItem[] | null
): Filter[] => {
  const filters: Filter[] = [];
  for (let index = 0; index < providers.length; index++) {
    const provider = providers[index];
    if (provider.length > 1) {
      // Only support 1 level of nesting currently
      const innerProviders = provider.map((innerProvider) => {
        return buildPrimitiveFilter(innerProvider);
      });
      const combinedFilter = {
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        meta: {
          type: FILTERS.COMBINED,
          relation: BooleanRelation.AND,
          params: innerProviders,
          index: undefined,
          disabled: false,
          negate: false,
        },
      };
      filters.push(combinedFilter);
    } else {
      const baseProvider = provider[0];

      const baseFilter = buildPrimitiveFilter(baseProvider);
      filters.push(baseFilter);
    }
  }
  return filters;
};

export const useInsightDataProviders = ({
  providers,
  alertData,
}: UseInsightDataProvidersProps): UseInsightDataProvidersResult => {
  const providersContainRangeQuery = useMemo(() => {
    return providers.some((innerProvider) => {
      return innerProvider.some((provider) => provider.queryType === 'range');
    });
  }, [providers]);
  const dataProviders: DataProvider[] = useMemo(() => {
    if (providersContainRangeQuery) {
      return [];
    } else {
      return buildDataProviders(providers, alertData);
    }
  }, [alertData, providers, providersContainRangeQuery]);
  const filters = useMemo(() => {
    if (!providersContainRangeQuery) {
      return [];
    } else {
      return buildFiltersFromInsightProviders(providers, alertData);
    }
  }, [providersContainRangeQuery, providers, alertData]);
  return { dataProviders, filters };
};
