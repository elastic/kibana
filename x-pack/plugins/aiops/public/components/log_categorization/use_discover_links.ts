/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import moment from 'moment';

import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import type { AiOpsIndexBasedAppState } from '../../application/utils/url_state';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import type { Category } from './use_categorize_request';

export const QUERY_MODE = {
  INCLUDE: 'should',
  EXCLUDE: 'must_not',
} as const;
export type QueryMode = typeof QUERY_MODE[keyof typeof QUERY_MODE];

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
    const _g = rison.encode({
      time: {
        from: moment(timefilterActiveBounds.min?.valueOf()).toISOString(),
        to: moment(timefilterActiveBounds.max?.valueOf()).toISOString(),
      },
    });

    const _a = rison.encode({
      filters: [...aiopsListState.filters, createFilter(index, field, selection, mode, category)],
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

export function createFilter(
  index: string,
  field: string,
  selection: Category[],
  mode: QueryMode,
  category?: Category
): Filter {
  const selectedRows = category === undefined ? selection : [category];
  return {
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
    meta: {
      alias: i18n.translate('xpack.aiops.logCategorization.filterAliasLabel', {
        defaultMessage: 'Categorization - {field}',
        values: {
          field,
        },
      }),
      index,
      disabled: false,
    },
  };
}
