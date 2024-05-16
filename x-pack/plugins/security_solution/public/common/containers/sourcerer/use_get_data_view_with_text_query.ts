/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import type { PluginStartDependencies } from '@kbn/security-plugin/public/plugin';
import { getESQLAdHocDataview, getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DataView } from '@kbn/data-views-plugin/common';

interface UseGetDataViewWithTextQueryArgs {
  query: AggregateQuery;
  dataViews: PluginStartDependencies['dataViews'];
  onSuccess: (dataView: DataView) => void;
}

export function useGetDataViewWithTextQuery({
  query,
  dataViews,
  onSuccess,
}: UseGetDataViewWithTextQueryArgs) {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  const indexPatternFromQuery = useMemo(() => {
    if (!('esql' in query)) {
      throw new Error('Only ESQL queries are supported');
    }
    return getIndexPatternFromESQLQuery(query.esql);
  }, [query]);

  const getDataView = useCallback(async () => {
    if (!dataViews) return;
    setIsLoading(true);
    const dataViewObj = await getESQLAdHocDataview(indexPatternFromQuery, dataViews);

    // If the indexPatternFromQuery is empty string means that the user used either the ROW or SHOW META / SHOW INFO commands
    // we don't want to add the @timestamp field in this case https://github.com/elastic/kibana/issues/163417
    if (indexPatternFromQuery && dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }

    onSuccess?.(dataViewObj);
    setDataView(dataViewObj);
    setIsLoading(false);
  }, [indexPatternFromQuery, dataViews, onSuccess]);

  return {
    dataView,
    getDataView,
    isLoading,
  };
}
