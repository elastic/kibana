/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import { useLocation } from 'react-router-dom';

export const INSTANCE_SEARCH_PARAM = 'instanceId';

export function useGetInstanceIdQueryParam(): string | undefined {
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);

  const instanceId = searchParams.get(INSTANCE_SEARCH_PARAM);

  return !!instanceId && instanceId !== ALL_VALUE ? instanceId : undefined;
}
