/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { PluginStartDependencies } from '@kbn/security-plugin/public/plugin';
import type { DataView, DataViewFieldMap } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLAdHocDataViewForSecuritySolution } from './helpers';

interface UseGetDataViewWithTextQueryArgs {
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
  dataViews,
  onDataViewCreationSuccess: onSuccess,
}: UseGetDataViewWithTextQueryArgs) {
  const [isLoading, setIsLoading] = useState(false);
  const [dataView, setDataView] = useState<DataView | undefined>(undefined);

  const getDataView = useCallback(
    async (query: AggregateQuery) => {
      setIsLoading(true);
      const esqlQuery = query?.esql;
      const indexPatternFromQuery = getIndexPatternFromESQLQuery(esqlQuery);
      /*
       * if indexPatternFromQuery is undefined, it means that the user used the ROW or SHOW META / SHOW INFO
       * source-commands. In this case, make no changes to the dataView Object
       *
       */
      if (!esqlQuery || !indexPatternFromQuery || indexPatternFromQuery === '') {
        setIsLoading(false);
        return;
      }
      const dataViewObj: DataView | undefined = await getESQLAdHocDataViewForSecuritySolution({
        dataViews,
        esqlQuery,
      });

      setDataView(dataViewObj);
      onSuccess?.(dataViewObj);
      setIsLoading(false);
    },
    [onSuccess, dataViews]
  );

  return {
    dataView,
    getDataView,
    isLoading,
  };
}
