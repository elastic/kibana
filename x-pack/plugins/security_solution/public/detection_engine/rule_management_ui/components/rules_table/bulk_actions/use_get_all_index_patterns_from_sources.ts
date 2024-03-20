/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from '../../../../../common/lib/kibana';

interface GetAllIndexPatternsFromSourcesParams {
  indexPatterns?: string[];
  dataViewIds?: string[];
}

export const useGetAllIndexPatternsFromSources = (
  sources?: GetAllIndexPatternsFromSourcesParams
): { indexPatterns: string[] } => {
  const [indexPatterns, setIndexPatterns] = useState<string[]>([]);
  const { data } = useKibana().services;

  useEffect(() => {
    const fetchAllIndexPatterns = async () => {
      const dataViewIndexPatterns = sources?.dataViewIds
        ? await Promise.all(
            sources.dataViewIds.map(async (id) => {
              const dv = await data.dataViews.get(id);
              return dv.getIndexPattern().split(',');
            })
          )
        : [];
      const patterns = new Set([
        ...(sources?.indexPatterns ?? []),
        ...dataViewIndexPatterns.flat(),
      ]);
      setIndexPatterns([...patterns]);
    };
    fetchAllIndexPatterns();
  }, [data.dataViews, sources]);

  return { indexPatterns };
};
