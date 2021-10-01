/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { useTrackedPromise } from '../utils/use_tracked_promise';
import { useKibanaContextForPlugin } from './use_kibana';

export const useKibanaIndexPatternService = () => {
  const {
    services: {
      data: { indexPatterns },
    },
  } = useKibanaContextForPlugin();

  return indexPatterns;
};

interface IndexPatternDescriptor {
  id: string;
  title: string;
}

export const useKibanaIndexPatternTitles = () => {
  const indexPatterns = useKibanaIndexPatternService();

  const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternDescriptor[]>([]);

  const [indexPatternTitlesRequest, fetchIndexPatternTitles] = useTrackedPromise(
    {
      createPromise: () => indexPatterns.getIdsWithTitle(true),
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
