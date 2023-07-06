/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { getDataTypeIndices } from '../../../../utils/observability_data_views';
import { AppDataType } from '../types';
import { ExploratoryEmbeddableProps } from '../../../..';

export function useLocalDataView(
  seriesDataType: AppDataType,
  dataTypesIndexPatterns: ExploratoryEmbeddableProps['dataTypesIndexPatterns']
) {
  const [dataViewTitle, setDataViewTitle] = useLocalStorage(
    `${seriesDataType}AppDataViewTitle`,
    ''
  );

  const initDatViewTitle = dataTypesIndexPatterns?.[seriesDataType];

  const { data: updatedDataViewTitle } = useFetcher(async () => {
    if (initDatViewTitle) {
      return initDatViewTitle;
    }
    return (await getDataTypeIndices(seriesDataType)).indices;
  }, [initDatViewTitle, seriesDataType]);

  useEffect(() => {
    if (updatedDataViewTitle) {
      setDataViewTitle(updatedDataViewTitle);
    }
  }, [setDataViewTitle, updatedDataViewTitle]);

  return { dataViewTitle: dataViewTitle || initDatViewTitle };
}
