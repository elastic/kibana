/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { useKibana } from '../hooks/use_kibana';

export const useAdd3PIntegrationRoute = (pkgkey: string) => {
  const { http } = useKibana().services;

  const path = pagePathGetters
    .add_integration_to_policy({
      pkgkey,
    })
    .join('');

  return http.basePath.prepend(path);
};
