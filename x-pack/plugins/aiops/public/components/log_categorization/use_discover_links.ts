/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from 'rison-node';
import moment from 'moment';

import { TimeRangeBounds } from '@kbn/data-plugin/common';
import { useAiOpsKibana } from '../../kibana_context';
import type { Category, QueryMode } from './log_categorization_page';
import type { AiOpsIndexBasedAppState } from '../explain_log_rate_spikes/explain_log_rate_spikes_app_state';

export function useDiscoverLinks() {
  const {
    services: {
      http: { basePath },
    },
  } = useAiOpsKibana();

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

    const from = moment(timefilterActiveBounds.min?.valueOf()).toISOString();
    const to = moment(timefilterActiveBounds.max?.valueOf()).toISOString();

    const _g = rison.encode({
      filters: [],
      refreshInterval: {
        pause: false,
        value: 30000,
      },
      time: {
        from,
        to,
      },
    });

    const _a = rison.encode({
      columns: [],
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
      sort: [['timestamp', 'desc']],
      viewMode: 'documents',
    });

    let path = basePath.get();
    path += '/app/discover#/';
    path += '?_g=' + _g;
    path += '&_a=' + encodeURIComponent(_a);
    window.open(path, '_blank');
  };

  return { openInDiscoverWithFilter };
}
