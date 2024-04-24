/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import type { AssetCriticality } from '../api';
import { useEntityAnalyticsRoutes } from '../api';

export const useEntityHistory = ({
  idField,
  idValue,
}: Pick<AssetCriticality, 'idField' | 'idValue'>) => {
  const { fetchEntityHistory } = useEntityAnalyticsRoutes();
  return useQuery(['GET', 'FETCH_RISK_ENGINE_PRIVILEGES'], () =>
    fetchEntityHistory({ idField, idValue })
  );
};
