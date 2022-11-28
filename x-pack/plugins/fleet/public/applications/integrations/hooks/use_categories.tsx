/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { sendGetCategories } from '../../fleet/hooks';

export function useCategoriesQuery(prerelease?: boolean) {
  return useQuery(['categories', prerelease], () =>
    sendGetCategories({ prerelease, include_policy_templates: true })
  );
}
