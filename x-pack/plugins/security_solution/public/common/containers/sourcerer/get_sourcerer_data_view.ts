/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { ensurePatternFormat } from '../../../../common/utils/sourcerer';

export const getSourcererDataView = async (
  dataViewId: string,
  dataViewsService: DataViewsContract
) => {
  const dataViewData = await dataViewsService.get(dataViewId);
  const defaultPatternsList = ensurePatternFormat(dataViewData.title.split(','));
  const patternList = defaultPatternsList.reduce((res: string[], pattern) => {
    if (dataViewData.matchedIndices.find((q) => q.includes(pattern.replace('*', '')))) {
      res.push(pattern);
    }
    return res;
  }, []);

  return {
    id: dataViewData.id ?? '',
    title: dataViewData.title,
    patternList,
  };
};
