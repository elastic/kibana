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
import type { DataView, DataViewFieldMap } from '@kbn/data-views-plugin/common';

interface UseGetDataViewWithTextQueryArgs {
  query: AggregateQuery;
  dataViews: PluginStartDependencies['dataViews'];
  onDataViewCreationSuccess: (dataView?: DataView) => void;
  /*
   * In Some cases, the esql query might not have an index pattern as
   * show in an example below :
   *
   * ROW test_column = "test_value"
   *
   * In cases like this, consumers have the ability to directly pass arbitrary
   * fieldSpecMap which will then be use to create the dataView.
   *
   * if this field is provided, the esql query will be ignored
   *
   * */
  getFieldSpecMap?: () => DataViewFieldMap;
}

export function useGetAdHocDataViewWithTextQuery({
  query,
  dataViews,
  onDataViewCreationSuccess: onSuccess,
}: UseGetDataViewWithTextQueryArgs) {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  const indexPatternFromQuery = useMemo(() => {
    return getIndexPatternFromESQLQuery(query.esql);
  }, [query]);

  const getDataViewBasedOnIndexPattern = useCallback(async () => {
    if (!dataViews) return;
    /*
     * if indexPatternFromQuery is undefined, it means that the user used the ROW or SHOW META / SHOW INFO
     * source-commands. In this case, make no changes to the dataView Object
     *
     */
    if (!indexPatternFromQuery) return;
    const dataViewObj = await getESQLAdHocDataview(indexPatternFromQuery, dataViews);

    /*
     *
     * If the indexPatternFromQuery is empty string means that the user used either the ROW or SHOW META / SHOW INFO commands
     * we don't want to add the @timestamp field in this case : https://github.com/elastic/kibana/issues/163417
     *
     * ESQL Ref: https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-commands.html
     *
     */
    if (indexPatternFromQuery && dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
      dataViewObj.timeFieldName = '@timestamp';
    }

    return dataViewObj;
  }, [indexPatternFromQuery, dataViews]);

  const getDataView = useCallback(async () => {
    setIsLoading(true);
    const dataViewObj: DataView | undefined = await getDataViewBasedOnIndexPattern();

    setDataView(dataViewObj);
    onSuccess?.(dataViewObj);
    setIsLoading(false);
  }, [getDataViewBasedOnIndexPattern, onSuccess]);

  return {
    dataView,
    getDataView,
    isLoading,
  };
}
