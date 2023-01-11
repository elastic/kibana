/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import moment from 'moment';

import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { Category } from './use_categorize_request';
import type { QueryMode } from './category_table';
import type { AiOpsIndexBasedAppState } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';

export function useDiscoverLinks() {
  const {
    http: { basePath },
  } = useAiopsAppContext();

  const openInDiscoverWithFilter = (
    index: string,
    field: string,
    selection: Category[],
    aiopsListState: Required<AiOpsIndexBasedAppState>,
    timefilterActiveBounds: TimeRangeBounds,
    mode: QueryMode,
    category?: Category
  ) => {
    const selectedRows = category === undefined ? selection : [category];

    const _g = rison.encode({
      time: {
        from: moment(timefilterActiveBounds.min?.valueOf()).toISOString(),
        to: moment(timefilterActiveBounds.max?.valueOf()).toISOString(),
      },
    });

    const _a = rison.encode({
      filters: [
        ...aiopsListState.filters,
        {
          query: {
            bool: {
              [mode]: selectedRows.map(({ key: query }) => ({
                match: {
                  [field]: {
                    auto_generate_synonyms_phrase_query: false,
                    fuzziness: 0,
                    operator: 'and',
                    query,
                  },
                },
              })),
            },
          },
        },
      ],
      index,
      interval: 'auto',
      query: {
        language: aiopsListState.searchQueryLanguage,
        query: aiopsListState.searchString,
      },
    });

    let path = basePath.get();
    path += '/app/discover#/';
    path += '?_g=' + _g;
    path += '&_a=' + encodeURIComponent(_a);
    window.open(path, '_blank');
  };

  return { openInDiscoverWithFilter };
}
