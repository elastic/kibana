/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { ensurePatternFormat } from '../../../../common/utils/sourcerer';
import type { SourcererDataView, RunTimeMappings } from '../../store/sourcerer/model';
import { getDataViewStateFromIndexFields } from '../source/use_data_view';

export const getSourcererDataView = async (
  dataViewId: string,
  dataViewsService: DataViewsContract,
  refreshFields = false
): Promise<SourcererDataView> => {
  const dataView = await dataViewsService.get(dataViewId, true, refreshFields);
  const dataViewData = dataView.toSpec();
  const defaultPatternsList = ensurePatternFormat(dataView.getIndexPattern().split(','));

  // typeguard used to assert that pattern is a string, otherwise
  // typescript expects patternList to be (string | null)[]
  // but we want it to always be string[]
  const filterTypeGuard = (str: unknown): str is string => str != null;
  const patternList = await Promise.all(
    defaultPatternsList.map(async (pattern) => {
      try {
        await dataViewsService.getFieldsForWildcard({
          type: dataViewData.type,
          rollupIndex: dataViewData?.typeMeta?.params?.rollup_index,
          allowNoIndex: false,
          pattern,
        });
        return pattern;
      } catch {
        return null;
      }
    })
  )
    .then((allPatterns) =>
      allPatterns.filter((pattern): pattern is string => filterTypeGuard(pattern))
    )
    .catch(() => defaultPatternsList);

  return {
    loading: false,
    id: dataViewData.id ?? '',
    title: dataView.getIndexPattern(),
    indexFields: dataView.fields,
    fields: dataViewData.fields,
    patternList,
    dataView: dataViewData,
    browserFields: getDataViewStateFromIndexFields(dataViewData.id ?? '', dataViewData.fields)
      .browserFields,
    runtimeMappings: dataViewData.runtimeFieldMap as RunTimeMappings,
  };
};
