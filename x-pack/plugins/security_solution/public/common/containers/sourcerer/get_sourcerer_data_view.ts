/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { ensurePatternFormat } from '../../../../common/utils/sourcerer';
import type { SourcererDataView } from '../../store/sourcerer/model';
import { getDataViewStateFromIndexFields } from '../source/use_data_view';

export const getSourcererDataView = async (
  dataViewId: string,
  dataViewsService: DataViewsContract,
  refreshFields = false
): Promise<SourcererDataView> => {
  const dataViewData = await dataViewsService.get(dataViewId, true, refreshFields);
  const defaultPatternsList = ensurePatternFormat(dataViewData.getIndexPattern().split(','));
  let patternList = [];

  try {
    for (const pattern of defaultPatternsList) {
      let indexExist = false;
      try {
        await dataViewsService.getFieldsForWildcard({
          type: dataViewData.type,
          rollupIndex: dataViewData?.typeMeta?.params?.rollup_index,
          allowNoIndex: false,
          pattern,
        });
        indexExist = true;
      } catch {
        indexExist = false;
      }
      if (indexExist) {
        patternList.push(pattern);
      }
    }
  } catch (exc) {
    patternList = defaultPatternsList;
  }

  return {
    loading: false,
    id: dataViewData.id ?? '',
    title: dataViewData.getIndexPattern(),
    indexFields: dataViewData.fields,
    fields: dataViewData.fields,
    patternList,
    dataView: dataViewData,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    browserFields: getDataViewStateFromIndexFields(dataViewData.id!, dataViewData.fields)
      .browserFields,
    runtimeMappings: dataViewData.getRuntimeMappings(),
  };
};
