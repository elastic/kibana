/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { parseVisualizationData } from './utils';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { inputsSelectors } from '../../store';
import type { VisualizationResponse } from './types';

export const useVisualizationResponse = ({ visualizationId }: { visualizationId: string }) => {
  const getGlobalQuery = inputsSelectors.globalQueryByIdSelector();
  const { inspect } = useDeepEqualSelector((state) => getGlobalQuery(state, visualizationId));
  const response = useMemo(
    () => (inspect ? parseVisualizationData<VisualizationResponse>(inspect?.response) : null),
    [inspect]
  );

  return response;
};
