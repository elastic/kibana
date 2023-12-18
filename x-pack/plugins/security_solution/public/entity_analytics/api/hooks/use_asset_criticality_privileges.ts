/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { useEntityAnalyticsRoutes } from '../api';

export const useAssetCriticalityPrivileges = () => {
  const { fetchAssetCriticalityPrivileges } = useEntityAnalyticsRoutes();
  return useQuery(['GET', 'FETCH_ASSET_CRITICALITY_PRIVILEGES'], fetchAssetCriticalityPrivileges);
};
