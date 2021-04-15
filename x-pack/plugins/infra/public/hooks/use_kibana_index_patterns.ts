/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useTrackedPromise } from '../utils/use_tracked_promise';
import { useKibanaContextForPlugin } from './use_kibana';

interface IndexPatternDescriptor {
  id: string;
  title: string;
}

export const useKibanaIndexPatternTitles = () => {
  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibanaContextForPlugin();

  const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternDescriptor[]>([]);

  const [indexPatternTitlesRequest, fetchIndexPatternTitles] = useTrackedPromise(
    {
      createPromise: () => indexPatterns.getIdsWithTitle(),
      onResolve: setIndexPatternTitles,
    },
    [indexPatterns]
  );

  return {
    fetchIndexPatternTitles,
    indexPatternTitles,
    latestIndexPatternTitlesRequest: indexPatternTitlesRequest,
  };
};
