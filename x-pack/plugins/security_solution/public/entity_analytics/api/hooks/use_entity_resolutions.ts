/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchEntity } from '@kbn/elastic-assistant-common';
import { useQuery } from '@tanstack/react-query';
import { useEntityAnalyticsRoutes } from '../api';

export const useEntityResolutions = (entity: SearchEntity) => {
  const { fetchEntityResolutions } = useEntityAnalyticsRoutes();

  return useQuery(['EA_LLM_ENTITY_RESOLUTION', entity], () =>
    fetchEntityResolutions({ name: entity.name, type: entity.type })
  );
};
