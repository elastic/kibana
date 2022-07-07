/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEsSearch } from '@kbn/observability-plugin/public';
import {
  formatHasRumResult,
  hasRumDataQuery,
} from '../../../../services/data/has_rum_data_query';
import { useDataView } from '../local_uifilters/use_data_view';

export function useHasRumData() {
  const { dataViewTitle } = useDataView();
  const { data: response, loading } = useEsSearch(
    {
      index: dataViewTitle,
      ...hasRumDataQuery({}),
    },
    [dataViewTitle],
    {
      name: 'UXHasRumData',
    }
  );

  return {
    data: formatHasRumResult(response, dataViewTitle),
    loading,
  };
}
