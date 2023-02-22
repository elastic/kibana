/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { ensurePatternFormat } from '../../../../common/utils/sourcerer';
import { useKibana } from '../../lib/kibana';

export const useFetchPatternList = (dataViewId: string | null) => {
  const {
    data: { dataViews: dataViewsService },
  } = useKibana().services;
  const [patternList, setPatternList] = useState<string[]>([]);

  useEffect(() => {
    const fetchAndSetPatternList = async (dvId: string) => {
      const dataViewData = await dataViewsService.get(dvId, true, true);
      const defaultPatternsList = ensurePatternFormat(dataViewData.getIndexPattern().split(','));
      const patList = defaultPatternsList.reduce((res: string[], pattern) => {
        if (dataViewData.matchedIndices.find((q) => q.includes(pattern.replaceAll('*', '')))) {
          res.push(pattern);
        }
        return res;
      }, []);
      setPatternList(patList);
    };
    if (dataViewId != null) {
      fetchAndSetPatternList(dataViewId);
    } else {
      setPatternList([]);
    }
  }, [dataViewId, dataViewsService]);

  return {
    patternList,
  };
};
