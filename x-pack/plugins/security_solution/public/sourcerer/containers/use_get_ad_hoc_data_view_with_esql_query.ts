/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import type { PluginStartDependencies } from '@kbn/security-plugin/public/plugin';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { DataView, DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { getESQLAdHocDataViewForSecuritySolution } from './helpers';

interface UseGetDataViewWithTextQueryArgs {
  query: AggregateQuery;
  dataViews: PluginStartDependencies['dataViews'];
  onDataViewCreationSuccess?: (dataView?: DataView) => void;
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

export function useGetAdHocDataViewWithESQLQuery({
  query,
  dataViews,
  onDataViewCreationSuccess: onSuccess,
}: UseGetDataViewWithTextQueryArgs) {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  const indexPatternFromQuery = useMemo(() => {
    return getIndexPatternFromESQLQuery(query.esql);
  }, [query]);

  const getDataView = useCallback(async () => {
    setIsLoading(true);
    /*
     * if indexPatternFromQuery is undefined, it means that the user used the ROW or SHOW META / SHOW INFO
     * source-commands. In this case, make no changes to the dataView Object
     *
     */
    if (!indexPatternFromQuery || indexPatternFromQuery === '') {
      setIsLoading(false);
      return;
    }
    const dataViewObj: DataView | undefined = await getESQLAdHocDataViewForSecuritySolution({
      dataViews,
      indexPattern: indexPatternFromQuery,
    });

    setDataView(dataViewObj);
    onSuccess?.(dataViewObj);
    setIsLoading(false);
  }, [onSuccess, dataViews, indexPatternFromQuery]);

  return {
    dataView,
    getDataView,
    isLoading,
  };
}
